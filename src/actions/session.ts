"use server";

import { db } from "@/lib/db";
import { sessions, cards, cardReviews } from "@/lib/db/schema";
import { eq, lte, and, sql } from "drizzle-orm";
import { scheduleCard } from "@/lib/fsrs";
import { Rating } from "ts-fsrs";
import { selectSessionCards } from "@/lib/session";
import { requireUser } from "@/lib/current-user";
import { notFound } from "next/navigation";
import type { Rating as RatingType, Card } from "@/types";

export async function createSessionAction(): Promise<{ sessionId: number }> {
  const user = await requireUser();
  const [session] = await db.insert(sessions).values({ userId: user.id }).returning({ id: sessions.id });
  return { sessionId: session.id };
}

export async function getDueCardsAction(): Promise<Card[]> {
  const user = await requireUser();
  const rows = await db.select().from(cards)
    .where(and(eq(cards.userId, user.id), eq(cards.isActive, true), lte(cards.due, new Date().toISOString())))
    .orderBy(cards.deckId, sql`CASE WHEN ${cards.state} = 0 THEN 1 ELSE 0 END`,
      sql`CASE ${cards.cefrLevel} WHEN 'A1' THEN 0 WHEN 'A2' THEN 1 WHEN 'B1' THEN 2 ELSE 3 END`,
      sql`RANDOM()`);
  return selectSessionCards(rows as Card[]);
}

export async function submitCardReviewAction(
  sessionId: number, cardId: number, rating: RatingType, responseTimeMs: number, sentence: string
): Promise<void> {
  const user = await requireUser();
  if (!Number.isSafeInteger(sessionId) || !Number.isSafeInteger(cardId) || ![1, 2, 3, 4].includes(rating) ||
      !Number.isInteger(responseTimeMs) || responseTimeMs < 0 || responseTimeMs > 2_147_483_647 ||
      typeof sentence !== "string" || sentence.length > 5000) throw new Error("Invalid review");

  await db.transaction(async (tx) => {
    const [session] = await tx.select().from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id))).for("update");
    if (!session) throw new Error("Study session is unavailable");
    const [existing] = await tx.select({ id: cardReviews.id }).from(cardReviews)
      .where(and(eq(cardReviews.sessionId, sessionId), eq(cardReviews.cardId, cardId))).limit(1);
    if (existing) return;
    if (session.completedAt) throw new Error("Study session is unavailable");
    const [card] = await tx.select().from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, user.id))).for("update");
    if (!card) throw new Error("Card not found");
    await tx.update(cards).set(scheduleCard(card, rating as Rating))
      .where(and(eq(cards.id, cardId), eq(cards.userId, user.id)));
    await tx.insert(cardReviews).values({ sessionId, cardId, rating, responseTimeMs, sentence });
  });
}

export async function completeSessionAction(sessionId: number, worstCardIds: number[]): Promise<void> {
  const user = await requireUser();
  if (!Number.isSafeInteger(sessionId) || !Array.isArray(worstCardIds) || worstCardIds.length > 3 ||
      !worstCardIds.every(Number.isSafeInteger)) throw new Error("Invalid session summary");
  await db.transaction(async (tx) => {
    const [session] = await tx.select().from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id))).for("update");
    if (!session) throw new Error("Study session not found");
    const reviews = await tx.select({ cardId: cardReviews.cardId }).from(cardReviews)
      .where(eq(cardReviews.sessionId, sessionId));
    const reviewedIds = new Set(reviews.map((review) => review.cardId));
    if (worstCardIds.some((id) => !reviewedIds.has(id))) throw new Error("Card was not reviewed in this session");
    await tx.update(sessions).set({ completedAt: session.completedAt ?? new Date().toISOString(),
      worstCardIds: JSON.stringify([...new Set(worstCardIds)]), totalCards: reviews.length })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)));
  });
}

export async function getSessionSummaryAction(sessionId: number) {
  const user = await requireUser();
  const [session] = await db.select().from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)));
  if (!session) notFound();
  const reviews = await db.select({ review: cardReviews, card: cards }).from(cardReviews)
    .innerJoin(cards, eq(cardReviews.cardId, cards.id))
    .where(and(eq(cardReviews.sessionId, sessionId), eq(cards.userId, user.id)));
  const worstIds: number[] = session.worstCardIds ? JSON.parse(session.worstCardIds) : [];
  return { session, reviews: reviews.map((r) => ({ ...r, isWorst: worstIds.includes(r.card.id) })), worstCardIds: worstIds };
}
