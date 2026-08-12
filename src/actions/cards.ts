"use server";

import { db } from "@/lib/db";
import { cards, vocabularyWords, sessions } from "@/lib/db/schema";
import { eq, and, isNotNull, notExists, sql, desc } from "drizzle-orm";
import { newCardDefaults } from "@/lib/fsrs";
import { shouldExpandDeck, dateToISO } from "@/lib/session";
import { CATEGORIES } from "@/types";

export async function expandDecksIfNeededAction(): Promise<void> {
  const today = dateToISO(new Date());

  for (const category of CATEGORIES) {
    const activeCards = await db
      .select({ stability: cards.stability, reps: cards.reps, nextReview: cards.nextReview })
      .from(cards)
      .where(and(eq(cards.category, category), eq(cards.isActive, true)));

    const now = new Date();
    const hasDueCards = activeCards.some((c) => new Date(c.nextReview) <= now);

    const todayNew = await db
      .select({ id: cards.id })
      .from(cards)
      .where(
        and(
          eq(cards.category, category),
          eq(cards.isActive, true),
          eq(cards.state, 0),
          sql`date(${cards.createdAt}) = ${today}`
        )
      );

    if (!shouldExpandDeck(activeCards, todayNew.length, hasDueCards)) continue;

    const nextWord = await db
      .select()
      .from(vocabularyWords)
      .where(
        and(
          eq(vocabularyWords.category, category),
          notExists(
            db
              .select({ id: cards.id })
              .from(cards)
              .where(eq(cards.wordId, vocabularyWords.id))
          )
        )
      )
      .limit(1);

    if (nextWord.length === 0) continue;

    await db.insert(cards).values({
      wordId: nextWord[0].id,
      category,
      ...newCardDefaults(),
      isActive: true,
    });
  }
}

export async function getCurrentStreakAction(): Promise<number> {
  const dates = await db
    .selectDistinct({ date: sql<string>`date(${sessions.completedAt})` })
    .from(sessions)
    .where(isNotNull(sessions.completedAt))
    .orderBy(desc(sql`date(${sessions.completedAt})`));

  const dateList = dates.map((d) => d.date).filter(Boolean) as string[];
  if (dateList.length === 0) return 0;

  const today = dateToISO(new Date());
  const yesterday = dateToISO(new Date(Date.now() - 86_400_000));

  if (dateList[0] !== today && dateList[0] !== yesterday) return 0;

  let streak = 0;
  for (let i = 0; i < dateList.length; i++) {
    const expected = dateToISO(new Date(Date.now() - i * 86_400_000));
    if (dateList[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
