"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CATEGORY_LABELS, CATEGORY_COLORS, type VocabCategory } from "@/types";

export interface CardReviewProps {
  sentence: string;
  targetChunk: string;
  meaning: string;
  hint?: string | null;
  sourceContext?: string | null;
  category?: VocabCategory | string | null;
  revealed: boolean;
}

interface SentenceSegment {
  text: string;
  isCloze: boolean;
  target: string;
}

/**
 * Parses a cloze-formatted sentence string.
 * Supports standard {{targetChunk}} syntax, or falls back to finding targetChunk directly.
 */
export function parseClozeSentence(
  sentence: string,
  targetChunk: string
): SentenceSegment[] {
  if (!sentence) return [];

  const clozeRegex = /\{\{(.+?)\}\}/g;
  const segments: SentenceSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = clozeRegex.exec(sentence)) !== null) {
    // Text before the cloze
    if (match.index > lastIndex) {
      segments.push({
        text: sentence.substring(lastIndex, match.index),
        isCloze: false,
        target: "",
      });
    }

    // The cloze target chunk
    segments.push({
      text: match[1],
      isCloze: true,
      target: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last cloze
  if (lastIndex < sentence.length) {
    segments.push({
      text: sentence.substring(lastIndex),
      isCloze: false,
      target: "",
    });
  }

  // Fallback if no {{...}} syntax was found in sentence
  if (segments.length === 0 || !segments.some((s) => s.isCloze)) {
    if (targetChunk && sentence.includes(targetChunk)) {
      const idx = sentence.indexOf(targetChunk);
      return [
        {
          text: sentence.substring(0, idx),
          isCloze: false,
          target: "",
        },
        {
          text: targetChunk,
          isCloze: true,
          target: targetChunk,
        },
        {
          text: sentence.substring(idx + targetChunk.length),
          isCloze: false,
          target: "",
        },
      ];
    }
    return [{ text: sentence, isCloze: false, target: "" }];
  }

  return segments;
}

export function CardReview({
  sentence,
  targetChunk,
  meaning,
  hint,
  sourceContext,
  category,
  revealed,
}: CardReviewProps) {
  const segments = useMemo(
    () => parseClozeSentence(sentence, targetChunk),
    [sentence, targetChunk]
  );

  const categoryKey = category as VocabCategory | undefined;
  const categoryColor =
    categoryKey && CATEGORY_COLORS[categoryKey]
      ? CATEGORY_COLORS[categoryKey]
      : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200";

  const categoryLabel =
    categoryKey && CATEGORY_LABELS[categoryKey]
      ? CATEGORY_LABELS[categoryKey]
      : category || "Sentence Mining";

  return (
    <Card className="overflow-hidden border-2 shadow-sm transition-all duration-200">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${categoryColor}`}
            >
              {categoryLabel}
            </span>
            {sourceContext && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {sourceContext}
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {revealed ? "Back" : "Front (Cloze)"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Main Sentence with Cloze Deletion / Highlight */}
        <div className="min-h-[90px] flex items-center justify-center p-4 rounded-xl bg-background/50 border border-muted/50">
          <p className="text-xl md:text-2xl leading-relaxed text-foreground text-center">
            {segments.map((segment, index) => {
              if (!segment.isCloze) {
                return <span key={index}>{segment.text}</span>;
              }

              if (!revealed) {
                // FRONT OF CARD: Styled Cloze Blank Space
                return (
                  <span
                    key={index}
                    className="inline-flex items-center justify-center min-w-[7rem] px-3 py-1 mx-1.5 my-0.5 border-b-2 border-dashed border-primary bg-primary/10 text-primary font-mono text-base font-semibold rounded-md shadow-inner transition-all animate-pulse"
                    title="Cloze Deletion: Fill in the blank"
                  >
                    [ &nbsp;? ? ?&nbsp; ]
                  </span>
                );
              }

              // BACK OF CARD: Visually Highlighted Target Chunk
              return (
                <mark
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 mx-1.5 my-0.5 rounded-lg bg-primary/20 text-primary font-bold border border-primary/40 underline decoration-primary decoration-2 underline-offset-4 shadow-sm animate-in fade-in zoom-in-95 duration-200"
                >
                  {segment.target || targetChunk}
                </mark>
              );
            })}
          </p>
        </div>

        {/* Back of Card: Meaning, Target Chunk Details & Hint */}
        {revealed ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Meaning Callout */}
            <div className="rounded-xl border bg-muted/40 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Meaning / Definition
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  &ldquo;{targetChunk}&rdquo;
                </span>
              </div>
              <p className="text-base text-foreground font-medium leading-relaxed">
                {meaning}
              </p>
            </div>

            {/* Hint & Context (if present) */}
            {hint && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg p-2.5 border border-muted">
                <span className="font-semibold text-foreground shrink-0">💡 Hint:</span>
                <span>{hint}</span>
              </div>
            )}
          </div>
        ) : (
          /* Front of Card: Optional Hint Preview if available */
          hint && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground italic">
                💡 Hint: {hint}
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
