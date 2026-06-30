import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  words: string[];
  readOnly?: boolean;
  onComplete?: () => void;
}

export function MonologuePrompt({ words, readOnly = false, onComplete }: Props) {
  return (
    <div className="container max-w-2xl mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compose Your Monologue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Speak or write a short monologue (2–3 minutes) that naturally uses all of these words:
          </p>
          <div className="flex flex-wrap gap-2">
            {words.map((w) => (
              <span
                key={w}
                className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-semibold"
              >
                {w}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
            This step is done outside the app — speak aloud, write in a notebook, or record yourself.
            The goal is to connect these words to your real thinking.
          </p>
        </CardContent>
      </Card>

      {!readOnly && onComplete && (
        <Button onClick={onComplete} className="w-full" size="lg">
          Done — View Session Summary
        </Button>
      )}
    </div>
  );
}
