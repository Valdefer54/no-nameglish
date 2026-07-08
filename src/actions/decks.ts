"use server";

import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { DAILY_NEW_CARD_LIMIT } from "@/lib/session";
import { CATEGORIES, type DeckStats } from "@/types";

export async function getDeckStatsAction(): Promise<DeckStats[]> {
  return Promise.all(
    CATEGORIES.map(async (category): Promise<DeckStats> => {
      const allCards = await db
        .select()
        .from(cards)
        .where(and(eq(cards.category, category), eq(cards.isActive, true)));

      const now = new Date();
      const dueCards = allCards.filter((c) => new Date(c.nextReview) <= now);
      const dueNewCount = dueCards.filter((c) => c.state === 0).length;
      const dueOtherCount = dueCards.length - dueNewCount;

      return {
        category,
        totalActive: allCards.length,
        newCount: allCards.filter((c) => c.state === 0).length,
        learningCount: allCards.filter((c) => c.state === 1 || c.state === 3).length,
        reviewCount: allCards.filter((c) => c.state === 2).length,
        matureCount: allCards.filter((c) => c.stability > 21 && c.reps >= 5).length,
        dueCount: dueOtherCount + Math.min(dueNewCount, DAILY_NEW_CARD_LIMIT),
      };
    })
  );
}
