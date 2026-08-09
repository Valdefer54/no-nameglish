"use server";

import { db } from "@/lib/db";
import { cards, vocabularyWords, sessions } from "@/lib/db/schema";
import { eq, and, isNotNull, notExists, sql, desc } from "drizzle-orm";
import { newCardDefaults } from "@/lib/fsrs";
import { learningSlotsToFill, dateToISO } from "@/lib/session";
import { CATEGORIES, type VocabCategory } from "@/types";

export async function expandDecksIfNeededAction(): Promise<void> {
  // The learning pool is one global budget, not a per-deck one: count every
  // active card that hasn't matured yet, regardless of category.
  const activeCards = await db
    .select({ stability: cards.stability, reps: cards.reps })
    .from(cards)
    .where(eq(cards.isActive, true));

  let slots = learningSlotsToFill(activeCards);
  if (slots === 0) return;

  // Fill the free slots round-robin so the pool stays spread across decks
  // instead of draining whichever one happens to have words left.
  const exhausted = new Set<VocabCategory>();
  let categoryIndex = 0;

  while (slots > 0 && exhausted.size < CATEGORIES.length) {
    const category = CATEGORIES[categoryIndex];
    categoryIndex = (categoryIndex + 1) % CATEGORIES.length;
    if (exhausted.has(category)) continue;

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

    if (nextWord.length === 0) {
      exhausted.add(category);
      continue;
    }

    await db.insert(cards).values({
      wordId: nextWord[0].id,
      category,
      ...newCardDefaults(),
      isActive: true,
    });

    slots--;
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
