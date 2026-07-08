import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS, CATEGORY_COLORS, type VocabCategory } from "@/types";

interface CardReviewProps {
  word: string;
  definition: string;
  exampleSentence: string;
  translationHint?: string | null;
  category: VocabCategory;
  revealed: boolean;
}

export function CardReview({
  word,
  definition,
  exampleSentence,
  translationHint,
  category,
  revealed,
}: CardReviewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-4xl font-bold leading-tight">
            {revealed ? word : "? ? ?"}
          </CardTitle>
          <span className={`mt-1 shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}>
            {CATEGORY_LABELS[category]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-base text-foreground">{definition}</p>
        {revealed && (
          <p className="text-sm italic text-muted-foreground border-l-2 border-muted pl-3">
            {exampleSentence}
          </p>
        )}
        {translationHint && (
          <p className="text-xs text-muted-foreground">Hint: {translationHint}</p>
        )}
      </CardContent>
    </Card>
  );
}
