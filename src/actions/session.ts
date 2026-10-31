"use server";

import { db } from "@/lib/db";
import { sessions, cards, cardReviews, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { scheduleCard } from "@/lib/fsrs";
import { Rating } from "ts-fsrs";
import { getStudyCards, isVocabularyCardUnlocked } from "@/lib/vocabulary-progress";
import { getSessionCardLimit } from "@/lib/session";
import { getDailyReviewBudget } from "@/lib/db/daily-reviews";
import { syncStudyProgress } from "@/lib/db/study-progress";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/current-user";
import { notFound } from "next/navigation";
import type { Rating as RatingType, Card } from "@/types";

export async function createSessionAction(requestId?: string): Promise<{ sessionId: number }> {
  const user = await requireUser();
  if (requestId !== undefined && (typeof requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))) {
    throw new Error("Invalid session request");
  }
  const insert = db.insert(sessions).values({ userId: user.id, requestId });
  // A retry after a lost response must return the original session without resetting it.
  const query = requestId === undefined ? insert : insert.onConflictDoUpdate({
    target: [sessions.userId, sessions.requestId], set: { requestId },
  });
  const [session] = await query.returning({ id: sessions.id });
  return { sessionId: session.id };
}

export async function getDueCardsAction(): Promise<Card[]> {
  const user = await requireUser();
  const rows = await db.select().from(cards)
    .where(and(eq(cards.userId, user.id), eq(cards.isActive, true)));
  const now = new Date();
  return getStudyCards(rows, user.studyLevel, user.beginnerLevel, now, await getDailyReviewBudget(user.id, now)) as Card[];
}

export async function submitCardReviewAction(
  sessionId: number, cardId: number, rating: RatingType, responseTimeMs: number, sentence: string
): Promise<{ error: "daily-limit" | "already-reviewed" } | void> {
  const user = await requireUser();
  if (!Number.isSafeInteger(sessionId) || !Number.isSafeInteger(cardId) || ![1, 2, 3, 4].includes(rating) ||
      !Number.isInteger(responseTimeMs) || responseTimeMs < 0 || responseTimeMs > 2_147_483_647 ||
      typeof sentence !== "string" || sentence.length > 5000) throw new Error("Invalid review");

  const saved = await db.transaction(async (tx) => {
    // Serialize this learner's quota check across tabs and study sessions.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for("update");
    const [session] = await tx.select().from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id))).for("update");
    if (!session) throw new Error("Study session is unavailable");
    const [existing] = await tx.select({ id: cardReviews.id }).from(cardReviews)
      .where(and(eq(cardReviews.sessionId, sessionId), eq(cardReviews.cardId, cardId))).limit(1);
    if (existing) return null;
    if (session.completedAt) throw new Error("Study session is unavailable");
    const [card] = await tx.select().from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, user.id))).for("update");
    if (!card) throw new Error("Card not found");
    if (!card.isActive || !isVocabularyCardUnlocked(card, user.studyLevel, user.beginnerLevel)) throw new Error("Vocabulary level is locked");
    const now = new Date();
    const budget = await getDailyReviewBudget(user.id, now, tx);
    if (budget.reviewedIds.has(card.id)) return "already-reviewed" as const;
    if ((budget.counts[card.deckId || "general"] ?? 0) >= getSessionCardLimit(user.studyLevel)) return "daily-limit" as const;
    if (new Date(card.due) > now) throw new Error("Card is not due yet");
    await tx.update(cards).set(scheduleCard(card, rating as Rating, now))
      .where(and(eq(cards.id, cardId), eq(cards.userId, user.id)));
    await tx.insert(cardReviews).values({ sessionId, cardId, rating, responseTimeMs, sentence, reviewedAt: now.toISOString() });
    return null;
  });
  if (saved) return { error: saved };
  if (user.studyLevel === "beginner") {
    const progress = await syncStudyProgress(user.id);
    if (progress.studyLevel !== user.studyLevel || progress.beginnerLevel !== user.beginnerLevel) revalidatePath("/", "layout");
  }
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
