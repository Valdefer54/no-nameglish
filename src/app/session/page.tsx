"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import type { CardWithWord, ReviewResult, ScoredCard, Rating } from "@/types";

type Phase = "loading" | "empty" | "reviewing" | "reinforcement" | "monologue";
type CardPhase = "front" | "revealed" | "sentence" | "feedback";

export default function SessionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [dueCards, setDueCards] = useState<CardWithWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [worstCards, setWorstCards] = useState<ScoredCard[]>([]);
  const [sentence, setSentence] = useState("");
  const [timerKey, setTimerKey] = useState(0);
  const cardStartTimeRef = useRef<number>(Date.now());

  const [cardPhase, setCardPhase] = useState<CardPhase>("front");
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    async function init() {
      await expandDecksIfNeededAction();

      const [{ sessionId: sid }, rawCards] = await Promise.all([
        createSessionAction(),
        getDueCardsAction(),
      ]);

      setSessionId(sid);

      if (rawCards.length === 0) {
        setPhase("empty");
        return;
      }

      // Map DB rows to typed CardWithWord objects
      const typed: CardWithWord[] = rawCards.map((r) => ({
        card: {
          id: r.card.id,
          wordId: r.card.wordId,
          stability: r.card.stability,
          difficulty: r.card.difficulty,
          elapsedDays: r.card.elapsedDays,
          scheduledDays: r.card.scheduledDays,
          reps: r.card.reps,
          lapses: r.card.lapses,
          state: r.card.state as 0 | 1 | 2 | 3,
          lastReview: r.card.lastReview,
          nextReview: r.card.nextReview,
          category: r.card.category as CardWithWord["card"]["category"],
          isActive: r.card.isActive,
          createdAt: r.card.createdAt,
        },
        word: {
          id: r.word.id,
          word: r.word.word,
          definition: r.word.definition,
          exampleSentence: r.word.exampleSentence,
          translationHint: r.word.translationHint,
          category: r.word.category as CardWithWord["word"]["category"],
          addedAt: r.word.addedAt,
          source: r.word.source as "seed" | "expansion",
        },
      }));

      setDueCards(typed);
      cardStartTimeRef.current = Date.now();
      setPhase("reviewing");
    }

    init();
  }, []);

  const currentCard = dueCards[currentIndex] as CardWithWord | undefined;
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
    (rating: Rating) => {
      if (!currentCard || sessionId === null) return;

      // "Again" means the word went badly — skip writing a sentence for it.
      if (rating === 1) {
        const responseTimeMs = Date.now() - cardStartTimeRef.current;
        const result: ReviewResult = {
          cardId: currentCard.card.id,
          word: currentCard.word.word,
          rating,
          responseTimeMs,
          sentence: "",
        };

        submitCardReviewAction(sessionId, currentCard.card.id, rating, responseTimeMs, "");

        const newResults = [...results, result];
        setResults(newResults);
        advanceToNext(newResults);
        return;
      }

      setSelectedRating(rating);
      setCardPhase("sentence");
    },
    [currentCard, sessionId, results, advanceToNext]
  );

  const handleSentenceSubmit = useCallback(async () => {
    if (!currentCard || sessionId === null || selectedRating === null) return;

    const responseTimeMs = Date.now() - cardStartTimeRef.current;
    const result: ReviewResult = {
      cardId: currentCard.card.id,
      word: currentCard.word.word,
      rating: selectedRating,
      responseTimeMs,
      sentence,
    };

    // Fire-and-forget: don't block UI on network call
    submitCardReviewAction(
      sessionId,
      currentCard.card.id,
      selectedRating,
      responseTimeMs,
      sentence
    );

    setResults((prev) => [...prev, result]);
    setCardPhase("feedback");
    setFeedbackLoading(true);
    setFeedbackText(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: currentCard.word.word,
          sentence,
          category: currentCard.word.category,
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
    await advanceToNext(results);
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
        <a href="/" className="text-primary underline text-sm">
          Back to Dashboard
        </a>
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
        <CardReview
          word={currentCard.word.word}
          definition={currentCard.word.definition}
          exampleSentence={currentCard.word.exampleSentence}
          translationHint={currentCard.word.translationHint}
          category={currentCard.word.category}
          revealed={cardPhase !== "front"}
        />

        {cardPhase === "front" && (
          <Button onClick={handleReveal} className="w-full" size="lg">
            Reveal
          </Button>
        )}

        {cardPhase === "revealed" && (
          <RatingButtons onRate={handleSelectRating} />
        )}

        {cardPhase === "sentence" && (
          <div className="space-y-4">
            <SentenceInput
              value={sentence}
              onChange={setSentence}
              placeholder={`Write a sentence using "${currentCard.word.word}"...`}
            />
            <Button
              onClick={handleSentenceSubmit}
              className="w-full"
              disabled={sentence.trim().length < 5}
            >
              Submit
            </Button>
          </div>
        )}

        {cardPhase === "feedback" && (
          <AIFeedback
            word={currentCard.word.word}
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
        words={worstCards.map((w) => w.word)}
        onComplete={() => router.push(`/session/${sessionId}/summary`)}
      />
    );
  }

  return null;
}
