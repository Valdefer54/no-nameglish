"use server";

import { db } from "@/lib/db";
import { sessions, cards, cardReviews, vocabularyWords } from "@/lib/db/schema";
import { eq, lte, and, sql } from "drizzle-orm";
import { scheduleCard } from "@/lib/fsrs";
import { Rating } from "ts-fsrs";
import type { Rating as RatingType } from "@/types";

export async function createSessionAction(): Promise<{ sessionId: number }> {
  const [session] = await db
    .insert(sessions)
    .values({})
    .returning({ id: sessions.id });
  return { sessionId: session.id };
}

export async function getDueCardsAction() {
  const now = new Date().toISOString();
  const rows = await db
    .select({ card: cards, word: vocabularyWords })
    .from(cards)
    .innerJoin(vocabularyWords, eq(cards.wordId, vocabularyWords.id))
    .where(and(eq(cards.isActive, true), lte(cards.nextReview, now)))
    .orderBy(cards.category, sql`RANDOM()`);
  return rows;
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

  await db.update(sessions).set({
    completedAt: new Date().toISOString(),
    worstCardIds: JSON.stringify(worstCardIds),
    totalCards: countResult[0].count,
  }).where(eq(sessions.id, sessionId));
}

export async function getSessionSummaryAction(sessionId: number) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!session) throw new Error(`Session ${sessionId} not found`);

  const reviews = await db
    .select({ review: cardReviews, card: cards, word: vocabularyWords })
    .from(cardReviews)
    .innerJoin(cards, eq(cardReviews.cardId, cards.id))
    .innerJoin(vocabularyWords, eq(cards.wordId, vocabularyWords.id))
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
