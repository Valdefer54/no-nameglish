import { getDeckStatsAction } from "@/actions/decks";
import { getCurrentStreakAction, expandDecksIfNeededAction } from "@/actions/cards";
import { getDueCardsAction } from "@/actions/session";
import { StreakCounter } from "@/components/StreakCounter";
import { DeckCard } from "@/components/DeckCard";
import { AddSentenceModal } from "@/components/AddSentenceModal";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await expandDecksIfNeededAction();

  const [streak, deckStats, dueCards] = await Promise.all([
    getCurrentStreakAction(),
    getDeckStatsAction(),
    getDueCardsAction(),
  ]);

  const totalDue = dueCards.length;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Daily Session</h1>
          <p className="text-muted-foreground mt-1">
            {totalDue > 0
              ? `${totalDue} cards due for review`
              : "All caught up for now"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AddSentenceModal triggerLabel="Mine New Word" variant="outline" />
          <StreakCounter streak={streak} />
        </div>
      </div>

      {totalDue > 0 ? (
        <Link href="/session">
          <Button size="lg" className="w-full text-base h-14 shadow-md font-semibold text-lg">
            Start Session ({totalDue} cards)
          </Button>
        </Link>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-3 bg-muted/20">
          <p className="text-muted-foreground font-medium">
            No cards due right now. You can mine and add new sentences below or check your decks.
          </p>
          <AddSentenceModal triggerLabel="Add a New Sentence" />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Decks</h2>
          <AddSentenceModal
            triggerLabel="+ Add Word / Sentence"
            variant="ghost"
            size="sm"
            triggerClassName="text-primary hover:text-primary hover:bg-primary/10"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deckStats.map((stats) => (
            <DeckCard key={stats.category} stats={stats} />
          ))}
        </div>
      </div>
    </div>
  );
}
