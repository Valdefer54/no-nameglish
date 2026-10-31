"use server";

import { db } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isMatureCard } from "@/lib/session";
import { getStudyCards } from "@/lib/vocabulary-progress";
import { getDailyReviewBudget } from "@/lib/db/daily-reviews";
import { CATEGORIES, type DeckStats } from "@/types";
import { requireUser } from "@/lib/current-user";

export async function getDeckStatsAction(): Promise<DeckStats[]> {
  const user = await requireUser();
  const categories = user.studyLevel === "beginner" ? ["general" as const] : CATEGORIES;
  const rows = await db.select().from(cards).where(and(eq(cards.userId, user.id), eq(cards.isActive, true)));
  const now = new Date();
  const dueCards = getStudyCards(rows, user.studyLevel, user.beginnerLevel, now, await getDailyReviewBudget(user.id, now));
  return categories.map((category): DeckStats => {
      const allCards = rows.filter((card) => card.deckId === category);
      return {
        category,
        totalActive: allCards.length,
        newCount: allCards.filter((c) => c.state === 0).length,
        learningCount: allCards.filter((c) => c.state === 1 || c.state === 3).length,
        reviewCount: allCards.filter((c) => c.state === 2).length,
        matureCount: allCards.filter(isMatureCard).length,
        dueCount: dueCards.filter((card) => (card.deckId || "general") === category).length,
      };
    });
}
