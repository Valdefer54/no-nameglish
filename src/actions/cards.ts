"use server";

import { db } from "@/lib/db";
import { cards, vocabularyWords, sessions } from "@/lib/db/schema";
import { eq, and, isNotNull, notExists, sql, desc, lte } from "drizzle-orm";
import { newCardDefaults } from "@/lib/fsrs";
import { MIN_WORDS_PER_CATEGORY, dateToISO } from "@/lib/session";
import { CATEGORIES } from "@/types";

export async function expandDecksIfNeededAction(): Promise<void> {
  const now = new Date().toISOString();

  for (const category of CATEGORIES) {
    // 1. Get all active cards in this category that are due right now
    const dueActiveCards = await db
      .select({ id: cards.id })
      .from(cards)
      .where(
        and(
          eq(cards.category, category),
          eq(cards.isActive, true),
          lte(cards.nextReview, now)
        )
      );

    const needed = Math.max(0, MIN_WORDS_PER_CATEGORY - dueActiveCards.length);
    if (needed <= 0) continue;

    // 2. Activate new words from vocabularyWords for this category
    const unactivatedWords = await db
      .select({ id: vocabularyWords.id })
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
      .limit(needed);

    for (const word of unactivatedWords) {
      await db.insert(cards).values({
        wordId: word.id,
        category,
        ...newCardDefaults(),
        isActive: true,
      });
    }

    // 3. If there are not enough unactivated words in vocabularyWords,
    // pull ahead active cards scheduled in the future so the category has at least 5 words
    const stillNeeded = needed - unactivatedWords.length;
    if (stillNeeded > 0) {
      const upcomingCards = await db
        .select({ id: cards.id })
        .from(cards)
        .where(
          and(
            eq(cards.category, category),
            eq(cards.isActive, true),
            sql`${cards.nextReview} > ${now}`
          )
        )
        .orderBy(cards.nextReview)
        .limit(stillNeeded);

      for (const card of upcomingCards) {
        await db
          .update(cards)
          .set({ nextReview: now })
          .where(eq(cards.id, card.id));
      }
    }
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
