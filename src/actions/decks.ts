"use server";

import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { DAILY_NEW_CARD_LIMIT, isMatureCard } from "@/lib/session";
import { CATEGORIES, type DeckStats } from "@/types";

export async function getDeckStatsAction(): Promise<DeckStats[]> {
  return Promise.all(
    CATEGORIES.map(async (category): Promise<DeckStats> => {
      const allCards = await db
        .select()
        .from(cards)
        .where(and(eq(cards.deckId, category), eq(cards.isActive, true)));

      const now = new Date();
      const dueCards = allCards.filter((c) => new Date(c.due) <= now);
      const dueNewCount = dueCards.filter((c) => c.state === 0).length;
      const dueOtherCount = dueCards.length - dueNewCount;

      return {
        category,
        totalActive: allCards.length,
        newCount: allCards.filter((c) => c.state === 0).length,
        learningCount: allCards.filter((c) => c.state === 1 || c.state === 3).length,
        reviewCount: allCards.filter((c) => c.state === 2).length,
        matureCount: allCards.filter(isMatureCard).length,
        dueCount: dueOtherCount + Math.min(dueNewCount, DAILY_NEW_CARD_LIMIT),
      };
    })
  );
}
