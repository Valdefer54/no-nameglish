"use server";

import { db } from "@/lib/db";
import { sessions, cards, cardReviews } from "@/lib/db/schema";
import { eq, lte, and, sql } from "drizzle-orm";
import { scheduleCard } from "@/lib/fsrs";
import { Rating } from "ts-fsrs";
import { selectSessionCards } from "@/lib/session";
import type { Rating as RatingType, Card } from "@/types";

export async function createSessionAction(): Promise<{ sessionId: number }> {
  const [session] = await db
    .insert(sessions)
    .values({})
    .returning({ id: sessions.id });
  return { sessionId: session.id };
}

export async function getDueCardsAction(): Promise<Card[]> {
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(cards)
    .where(and(eq(cards.isActive, true), lte(cards.due, now)))
    .orderBy(
      cards.deckId,
      sql`CASE WHEN ${cards.state} = 0 THEN 1 ELSE 0 END`,
      sql`RANDOM()`
    );

  return selectSessionCards(rows as Card[]);
}

export async function submitCardReviewAction(
  sessionId: number,
  cardId: number,
  rating: RatingType,
  responseTimeMs: number,
  sentence: string
): Promise<void> {
  const [card] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!card) throw new Error(`Card ${cardId} not found`);

  const updates = scheduleCard(card, rating as Rating);
  await db.update(cards).set(updates).where(eq(cards.id, cardId));
  await db.insert(cardReviews).values({
    sessionId,
    cardId,
    rating,
    responseTimeMs,
    sentence,
  });
}

export async function completeSessionAction(
  sessionId: number,
  worstCardIds: number[]
): Promise<void> {
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cardReviews)
    .where(eq(cardReviews.sessionId, sessionId));

  await db
    .update(sessions)
    .set({
      completedAt: new Date().toISOString(),
      worstCardIds: JSON.stringify(worstCardIds),
      totalCards: Number(countResult[0]?.count ?? 0),
    })
    .where(eq(sessions.id, sessionId));
}

export async function getSessionSummaryAction(sessionId: number) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) throw new Error(`Session ${sessionId} not found`);

  const reviews = await db
    .select({ review: cardReviews, card: cards })
    .from(cardReviews)
    .innerJoin(cards, eq(cardReviews.cardId, cards.id))
    .where(eq(cardReviews.sessionId, sessionId));

  const worstIds: number[] = session.worstCardIds
    ? JSON.parse(session.worstCardIds)
    : [];

  return {
    session,
    reviews: reviews.map((r) => ({
      ...r,
      isWorst: worstIds.includes(r.card.id),
    })),
    worstCardIds: worstIds,
  };
}
