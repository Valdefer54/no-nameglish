"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface SentenceInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  minCharacters?: number;
  targetChunk?: string;
}

export function SentenceInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  label = "Your Sentence / Cloze Answer",
  autoFocus = true,
  minCharacters = 5,
  targetChunk,
}: SentenceInputProps) {
  const charCount = value.trim().length;
  const isReady = charCount >= minCharacters;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isReady && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="sentence-input" className="text-sm font-medium text-foreground">
          {label}
        </Label>
        {targetChunk && (
          <span className="text-xs text-muted-foreground">
            Target chunk: <strong className="text-primary font-semibold">{targetChunk}</strong>
          </span>
        )}
      </div>

      <Textarea
        id="sentence-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          placeholder ||
          (targetChunk
            ? `Compose a sentence incorporating "${targetChunk}" or fill the cloze...`
            : "Write your sentence here...")
        }
        rows={3}
        className="resize-none font-normal text-base leading-relaxed border-2 focus-visible:ring-primary"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {!isReady ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Write at least {minCharacters} characters ({charCount}/{minCharacters})
            </span>
          ) : (
            <span className="text-green-600 dark:text-green-400 font-medium">
              ✓ Ready to submit (Press ⌘+Enter)
            </span>
          )}
        </span>
        <span className="text-muted-foreground/70">
          {charCount} character{charCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
