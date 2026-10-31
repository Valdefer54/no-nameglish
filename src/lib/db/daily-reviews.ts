import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "./index";
import { cards, cardReviews, sessions } from "./schema";
import type { DailyReviewBudget } from "@/lib/vocabulary-progress";

type Database = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getDailyReviewBudget(userId: string, now = new Date(), database: Database = db): Promise<DailyReviewBudget> {
  const localDay = sql`date_trunc('day', ${now.toISOString()}::timestamptz AT TIME ZONE 'America/Bogota')`;
  const rows = await database.select({ cardId: cardReviews.cardId, category: cards.deckId }).from(cardReviews)
    .innerJoin(sessions, eq(cardReviews.sessionId, sessions.id))
    .innerJoin(cards, eq(cardReviews.cardId, cards.id))
    .where(and(eq(sessions.userId, userId),
      gte(cardReviews.reviewedAt, sql`${localDay} AT TIME ZONE 'America/Bogota'`),
      lt(cardReviews.reviewedAt, sql`(${localDay} + interval '1 day') AT TIME ZONE 'America/Bogota'`)));
  const budget: DailyReviewBudget = { counts: {}, reviewedIds: new Set() };
  for (const row of rows) {
    const category = row.category || "general";
    budget.counts[category] = (budget.counts[category] ?? 0) + 1;
    budget.reviewedIds.add(row.cardId);
  }
  return budget;
}
