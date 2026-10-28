"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCardAction } from "@/actions/cards";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type VocabCategory,
} from "@/types";
import { Sparkles, Plus, Check, Loader2, X, Eye } from "lucide-react";

interface Props {
  beginner?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function AddSentenceModal({
  beginner = false,
  triggerClassName = "",
  triggerLabel = "Add Sentence",
  variant = "default",
  size = "default",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputWord, setInputWord] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [sentence, setSentence] = useState("");
  const [targetChunk, setTargetChunk] = useState("");
  const [meaning, setMeaning] = useState("");
  const [hint, setHint] = useState("");
  const [category, setCategory] = useState<VocabCategory>("general");
  const [showPreview, setShowPreview] = useState(true);

  const handleOpen = () => {
    setIsOpen(true);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleGenerateAI = async () => {
    if (!inputWord.trim()) {
      setErrorMessage("Please enter a word, phrase, or sentence first.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/ai/mine-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputWord.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate sentence.");
      }

      const data = await res.json();
      setSentence(data.sentence || "");
      setTargetChunk(data.targetChunk || inputWord.trim());
      setMeaning(data.meaning || "");
      setHint(data.hint || "");
      if (data.category && CATEGORIES.includes(data.category)) {
        setCategory(data.category);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not generate sentence with AI. You can still fill it manually.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sentence.trim() || !targetChunk.trim() || !meaning.trim()) {
      setErrorMessage("Please fill in the sentence, target chunk, and meaning.");
      return;
    }

    // Ensure sentence contains {{targetChunk}}
    let formattedSentence = sentence.trim();
    if (!formattedSentence.includes("{{") || !formattedSentence.includes("}}")) {
      if (formattedSentence.includes(targetChunk.trim())) {
        formattedSentence = formattedSentence.replace(
          targetChunk.trim(),
          `{{${targetChunk.trim()}}}`
        );
      } else {
        formattedSentence = `${formattedSentence} {{${targetChunk.trim()}}}`;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createCardAction({
        sentence: formattedSentence,
        targetChunk: targetChunk.trim(),
        meaning: meaning.trim(),
        hint: hint.trim() || null,
        category,
        sourceContext: "User Mined / AI Assisted",
      });

      if (res.success) {
        setSuccessMessage(`Card for "${targetChunk.trim()}" added to ${CATEGORY_LABELS[category]}!`);
        // Reset fields
        setInputWord("");
        setSentence("");
        setTargetChunk("");
        setMeaning("");
        setHint("");
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMessage(null);
        }, 1200);
      } else {
        setErrorMessage(res.error || "Failed to add card.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview formatting
  const previewFront = sentence
    ? sentence.replace(/\{\{(.+?)\}\}/g, "[ ? ? ? ]")
    : targetChunk
    ? `... [ ? ? ? ] ...`
    : "Your sentence will appear here with [ ? ? ? ] as the blank.";

  const previewBack = sentence
    ? sentence.replace(/\{\{(.+?)\}\}/g, `$1`)
    : targetChunk || "";

  return (
    <>
      <Button
        onClick={handleOpen}
        variant={variant}
        size={size}
        className={`gap-2 items-center font-medium shadow-sm transition-all ${triggerClassName}`}
      >
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Mine & Add New Sentence</h2>
                  <p className="text-xs text-muted-foreground">
                    Type a word or paste a sentence — AI will auto-complete the cloze & category.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* AI Generation Input Bar */}
            <div className="space-y-2 bg-muted/40 p-4 rounded-xl border">
              <Label htmlFor="ai-word-input" className="text-xs font-semibold uppercase tracking-wide text-primary">
                Word, Phrase or Raw Sentence
              </Label>
              <div className="flex gap-2">
                <input
                  id="ai-word-input"
                  type="text"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGenerateAI();
                    }
                  }}
                  placeholder="e.g. turn down, albeit, substantiate, or paste sentence..."
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !inputWord.trim()}
                  className="shrink-0 gap-1.5"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI Complete
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Feedback Messages */}
            {errorMessage && (
              <div className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 text-sm text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-900 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                {successMessage}
              </div>
            )}

            {/* Detailed Form */}
            <form onSubmit={handleSaveCard} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Chunk */}
                <div className="space-y-1.5">
                  <Label htmlFor="target-chunk" className="text-xs font-medium">
                    Target Chunk / Vocabulary <span className="text-red-500">*</span>
                  </Label>
                  <input
                    id="target-chunk"
                    type="text"
                    value={targetChunk}
                    onChange={(e) => setTargetChunk(e.target.value)}
                    placeholder="e.g. turn down"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Category Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="category-select" className="text-xs font-medium">
                    Category / Deck <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VocabCategory)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                  >
                    {(beginner ? ["general" as const] : CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cloze Sentence */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cloze-sentence" className="text-xs font-medium">
                    Cloze Sentence (Use &#123;&#123;targetChunk&#125;&#125; for the blank) <span className="text-red-500">*</span>
                  </Label>
                  {category && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[category]}`}
                    >
                      {CATEGORY_LABELS[category]}
                    </span>
                  )}
                </div>
                <Textarea
                  id="cloze-sentence"
                  value={sentence}
                  onChange={(e) => setSentence(e.target.value)}
                  placeholder="e.g. The company decided to {{turn down}} the acquisition offer."
                  rows={3}
                  className="resize-none text-sm leading-relaxed"
                  required
                />
              </div>

              {/* Meaning / Definition */}
              <div className="space-y-1.5">
                <Label htmlFor="meaning-input" className="text-xs font-medium">
                  Meaning / Definition <span className="text-red-500">*</span>
                </Label>
                <input
                  id="meaning-input"
                  type="text"
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="e.g. To reject or refuse an offer or proposal."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* Hint */}
              <div className="space-y-1.5">
                <Label htmlFor="hint-input" className="text-xs font-medium text-muted-foreground">
                  Contextual Hint (Optional)
                </Label>
                <input
                  id="hint-input"
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="e.g. To reject or decline."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary text-muted-foreground"
                />
              </div>

              {/* Live Preview Toggle */}
              <div className="pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {showPreview ? "Hide Preview" : "Show Card Preview"}
                </button>

                {showPreview && (sentence || targetChunk) && (
                  <Card className="mt-3 bg-muted/20 border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Card Front (During Review)
                        </span>
                        <p className="text-sm font-medium mt-1 text-foreground">
                          {previewFront}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-muted">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          Card Back (Revealed)
                        </span>
                        <p className="text-sm font-medium mt-1 text-foreground">
                          {previewBack}
                        </p>
                        {meaning && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <strong>Meaning:</strong> {meaning}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !sentence.trim() || !targetChunk.trim() || !meaning.trim()}
                  className="gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Card...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add to Deck
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
