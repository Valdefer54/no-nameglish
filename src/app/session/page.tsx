"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CardReview } from "@/components/CardReview";
import { SentenceInput } from "@/components/SentenceInput";
import { RatingButtons } from "@/components/RatingButtons";
import { AIFeedback } from "@/components/AIFeedback";
import { Timer } from "@/components/Timer";
import { WorstCardsChallenge } from "@/components/WorstCardsChallenge";
import { MonologuePrompt } from "@/components/MonologuePrompt";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  getDueCardsAction,
  createSessionAction,
  submitCardReviewAction,
  completeSessionAction,
} from "@/actions/session";
import { expandDecksIfNeededAction } from "@/actions/cards";
import { findWorstThreeCards } from "@/lib/session";
import type { Card, ReviewResult, ScoredCard, Rating } from "@/types";

type Phase = "loading" | "empty" | "reviewing" | "reinforcement" | "monologue";
type CardPhase = "front" | "revealed" | "sentence" | "feedback";

export default function SessionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [worstCards, setWorstCards] = useState<ScoredCard[]>([]);
  const [sentence, setSentence] = useState("");
  const [timerKey, setTimerKey] = useState(0);
  const cardStartTimeRef = useRef<number>(0);

  const [cardPhase, setCardPhase] = useState<CardPhase>("front");
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const savingRef = useRef(false);

  useEffect(() => {
    async function init() {
      await expandDecksIfNeededAction();

      const [{ sessionId: sid }, cardsList] = await Promise.all([
        createSessionAction(),
        getDueCardsAction(),
      ]);

      setSessionId(sid);

      if (cardsList.length === 0) {
        setPhase("empty");
        return;
      }

      setDueCards(cardsList);
      cardStartTimeRef.current = Date.now();
      setPhase("reviewing");
    }

    init();
  }, []);

  const currentCard = dueCards[currentIndex] as Card | undefined;
  const progress = dueCards.length > 0 ? (currentIndex / dueCards.length) * 100 : 0;

  const handleReveal = useCallback(() => {
    setCardPhase("revealed");
  }, []);

  const advanceToNext = useCallback(
    async (newResults: ReviewResult[]) => {
      setSentence("");
      setSelectedRating(null);
      setFeedbackText(null);

      if (currentIndex + 1 >= dueCards.length) {
        const worst = findWorstThreeCards(newResults);
        setWorstCards(worst);
        if (sessionId !== null) {
          await completeSessionAction(
            sessionId,
            worst.map((w) => w.cardId)
          );
        }
        setPhase("reinforcement");
      } else {
        setCurrentIndex((i) => i + 1);
        cardStartTimeRef.current = Date.now();
        setTimerKey((k) => k + 1);
        setCardPhase("front");
      }
    },
    [currentIndex, dueCards.length, sessionId]
  );

  const handleSelectRating = useCallback(
    async (rating: Rating) => {
      if (!currentCard || sessionId === null || savingRef.current) return;

      // "Again" means the card went badly — skip writing a sentence for it.
      if (rating === 1) {
        const responseTimeMs = Date.now() - cardStartTimeRef.current;
        const result: ReviewResult = {
          cardId: currentCard.id,
          targetChunk: currentCard.targetChunk,
          word: currentCard.targetChunk,
          rating,
          responseTimeMs,
          sentence: "",
        };

        savingRef.current = true; setSaving(true); setSaveError("");
        try {
          await submitCardReviewAction(sessionId, currentCard.id, rating, responseTimeMs, "");
          const newResults = results.some((review) => review.cardId === result.cardId) ? results : [...results, result];
          setResults(newResults);
          await advanceToNext(newResults);
        } catch { setSaveError("Could not save your review. Please try again."); }
        finally { savingRef.current = false; setSaving(false); }
        return;
      }

      setSelectedRating(rating);
      setCardPhase("sentence");
    },
    [currentCard, sessionId, results, advanceToNext]
  );

  const handleSentenceSubmit = useCallback(async () => {
    if (!currentCard || sessionId === null || selectedRating === null || savingRef.current) return;

    const responseTimeMs = Date.now() - cardStartTimeRef.current;
    const result: ReviewResult = {
      cardId: currentCard.id,
      targetChunk: currentCard.targetChunk,
      word: currentCard.targetChunk,
      rating: selectedRating,
      responseTimeMs,
      sentence,
    };

    savingRef.current = true; setSaving(true); setSaveError("");
    try {
      await submitCardReviewAction(
      sessionId,
      currentCard.id,
      selectedRating,
      responseTimeMs,
      sentence
      );
    } catch {
      setSaveError("Could not save your review. Please try again.");
      return;
    } finally { savingRef.current = false; setSaving(false); }

    setResults((prev) => [...prev, result]);
    setCardPhase("feedback");
    setFeedbackLoading(true);
    setFeedbackText(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: currentCard.targetChunk,
          sentence,
          category: currentCard.deckId,
        }),
      });
      const data = (await res.json()) as { feedback: string };
      setFeedbackText(data.feedback);
    } catch {
      setFeedbackText("Could not get feedback right now. Try again later.");
    } finally {
      setFeedbackLoading(false);
    }
  }, [currentCard, sessionId, selectedRating, sentence]);

  const handleNext = useCallback(async () => {
    try { setSaveError(""); await advanceToNext(results); }
    catch { setSaveError("Could not finish the session. Please try Next again."); }
  }, [advanceToNext, results]);

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading your cards...</p>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="container max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-semibold">All caught up!</h2>
        <p className="text-muted-foreground">No cards are due right now. Come back later.</p>
        <Link href="/" className="text-primary underline text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (phase === "reviewing" && currentCard) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {currentIndex + 1} / {dueCards.length}
          </span>
          <Timer key={timerKey} />
        </div>
        <Progress value={progress} className="h-1.5" />
        {currentCard.cefrLevel && <p className="text-sm text-muted-foreground">Vocabulary level: {currentCard.cefrLevel}</p>}
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <CardReview
          sentence={currentCard.sentence}
          targetChunk={currentCard.targetChunk}
          meaning={currentCard.meaning}
          hint={currentCard.hint}
          sourceContext={currentCard.sourceContext}
          category={currentCard.deckId}
          revealed={cardPhase !== "front"}
        />

        {cardPhase === "front" && (
          <Button onClick={handleReveal} className="w-full" size="lg">
            Reveal
          </Button>
        )}

        {cardPhase === "revealed" && (
          <RatingButtons onRate={handleSelectRating} disabled={saving} />
        )}

        {cardPhase === "sentence" && (
          <div className="space-y-4">
            <SentenceInput
              value={sentence}
              onChange={setSentence}
              onSubmit={handleSentenceSubmit}
              targetChunk={currentCard.targetChunk}
              placeholder={`Write a sentence using "${currentCard.targetChunk}"...`}
            />
            <Button
              onClick={handleSentenceSubmit}
              className="w-full"
              disabled={saving || sentence.trim().length < 5}
            >
              Submit
            </Button>
          </div>
        )}

        {cardPhase === "feedback" && (
          <AIFeedback
            word={currentCard.targetChunk}
            sentence={sentence}
            feedback={feedbackText}
            isLoading={feedbackLoading}
            onNext={handleNext}
          />
        )}
      </div>
    );
  }

  if (phase === "reinforcement") {
    return (
      <WorstCardsChallenge
        worstCards={worstCards}
        onComplete={() => setPhase("monologue")}
      />
    );
  }

  if (phase === "monologue") {
    return (
      <MonologuePrompt
        words={worstCards.map((w) => w.targetChunk || w.word || "")}
        onComplete={() => router.push(`/session/${sessionId}/summary`)}
      />
    );
  }

  return null;
}
