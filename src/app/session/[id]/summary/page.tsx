import { getSessionSummaryAction } from "@/actions/session";
import { SessionSummary } from "@/components/SessionSummary";
import { MonologuePrompt } from "@/components/MonologuePrompt";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SummaryPage({ params }: Props) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  if (isNaN(sessionId)) notFound();

  const { session, reviews, worstCardIds } = await getSessionSummaryAction(sessionId);

  if (!session) notFound();

  const worstWords = reviews
    .filter((r) => worstCardIds.includes(r.card.id))
    .map((r) => r.word.word);

  const duration = session.completedAt
    ? Math.round(
        (new Date(session.completedAt).getTime() -
          new Date(session.startedAt).getTime()) /
          1000 /
          60
      )
    : null;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Session Complete</h1>
          {duration !== null && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {session.totalCards} cards in {duration} minutes
            </p>
          )}
        </div>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <SessionSummary reviews={reviews} />

      {worstWords.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Monologue prompt</h2>
          <p className="text-sm text-muted-foreground">
            These were your lowest-scoring cards. Use them in a short monologue today.
          </p>
          <MonologuePrompt words={worstWords} readOnly />
        </div>
      )}
    </div>
  );
}
