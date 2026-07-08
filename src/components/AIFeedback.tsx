"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AIFeedbackProps {
  word: string;
  sentence: string;
  feedback: string | null;
  isLoading: boolean;
  onNext: () => void;
}

export function AIFeedback({ word, sentence, feedback, isLoading, onNext }: AIFeedbackProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Your sentence for &ldquo;{word}&rdquo;
        </p>
        <p className="text-sm italic border-l-2 border-muted pl-3 text-foreground">
          {sentence}
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">
              Analyzing your sentence...
            </p>
          ) : feedback ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Feedback
              </p>
              <p className="text-sm text-foreground">{feedback}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No feedback available.</p>
          )}
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full" disabled={isLoading}>
        Next card →
      </Button>
    </div>
  );
}
