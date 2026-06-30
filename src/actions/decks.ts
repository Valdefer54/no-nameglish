"use server";

import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { CATEGORIES, type DeckStats } from "@/types";

export async function getDeckStatsAction(): Promise<DeckStats[]> {
  return Promise.all(
    CATEGORIES.map(async (category): Promise<DeckStats> => {
      const allCards = await db
        .select()
        .from(cards)
        .where(and(eq(cards.category, category), eq(cards.isActive, true)));

      const now = new Date();

      return {
        category,
        totalActive: allCards.length,
        newCount: allCards.filter((c) => c.state === 0).length,
        learningCount: allCards.filter((c) => c.state === 1 || c.state === 3).length,
        reviewCount: allCards.filter((c) => c.state === 2).length,
        matureCount: allCards.filter((c) => c.stability > 21 && c.reps >= 5).length,
        dueCount: allCards.filter((c) => new Date(c.nextReview) <= now).length,
      };
    })
  );
}
