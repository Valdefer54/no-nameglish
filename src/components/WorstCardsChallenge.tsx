"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ScoredCard } from "@/types";

interface Props {
  worstCards: ScoredCard[];
  onComplete: () => void;
}

export function WorstCardsChallenge({ worstCards, onComplete }: Props) {
  const [sentences, setSentences] = useState<string[]>(worstCards.map(() => ""));
  const allFilled = sentences.every((s) => s.trim().length >= 5);

  const RATING_LABELS: Record<number, string> = {
    1: "Again",
    2: "Hard",
    3: "Good",
    4: "Easy",
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reinforcement Challenge</h2>
        <p className="text-muted-foreground mt-1">
          These were your hardest words this session. Write a new sentence for each one.
        </p>
      </div>

      <div className="space-y-6">
        {worstCards.map((card, i) => (
          <div key={card.cardId} className="space-y-2 rounded-lg border p-4 bg-red-50 dark:bg-red-950/20">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl">{card.word}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">
                {RATING_LABELS[card.rating]} · {card.responseTimeSeconds.toFixed(0)}s
              </span>
            </div>
            <Textarea
              value={sentences[i]}
              onChange={(e) => {
                const next = [...sentences];
                next[i] = e.target.value;
                setSentences(next);
              }}
              placeholder={`Use "${card.word}" in a sentence...`}
              rows={2}
              className="resize-none"
            />
          </div>
        ))}
      </div>

      <Button onClick={onComplete} disabled={!allFilled} className="w-full" size="lg">
        Continue to Monologue Prompt
      </Button>
    </div>
  );
}
