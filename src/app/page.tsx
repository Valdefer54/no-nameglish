import { getDeckStatsAction } from "@/actions/decks";
import { getCurrentStreakAction } from "@/actions/cards";
import { getDueCardsAction } from "@/actions/session";
import { StreakCounter } from "@/components/StreakCounter";
import { DeckCard } from "@/components/DeckCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const [streak, deckStats, dueCards] = await Promise.all([
    getCurrentStreakAction(),
    getDeckStatsAction(),
    getDueCardsAction(),
  ]);

  const totalDue = dueCards.length;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Session</h1>
          <p className="text-muted-foreground mt-1">
            {totalDue > 0
              ? `${totalDue} cards due for review`
              : "All caught up for now"}
          </p>
        </div>
        <StreakCounter streak={streak} />
      </div>

      {totalDue > 0 ? (
        <Link href="/session">
          <Button size="lg" className="w-full text-base h-14">
            Start Session ({totalDue} cards)
          </Button>
        </Link>
      ) : (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No cards due right now. Come back later or check your decks.
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Your Decks</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deckStats.map((stats) => (
            <DeckCard key={stats.category} stats={stats} />
          ))}
        </div>
      </div>
    </div>
  );
}
