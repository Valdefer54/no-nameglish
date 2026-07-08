"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SentenceInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SentenceInput({
  value,
  onChange,
  placeholder,
  autoFocus = true,
}: SentenceInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="sentence-input">Your sentence</Label>
      <Textarea
        id="sentence-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
      />
      <p className="text-xs text-muted-foreground">
        {value.trim().length < 5
          ? "Write at least 5 characters before submitting"
          : "✓ Ready to submit"}
      </p>
    </div>
  );
}
