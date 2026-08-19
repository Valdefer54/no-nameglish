"use server";

import { db } from "@/lib/db";
import { cards, sessions } from "@/lib/db/schema";
import { eq, and, isNotNull, sql, desc, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { MIN_WORDS_PER_CATEGORY, dateToISO } from "@/lib/session";
import { CATEGORIES, type VocabCategory } from "@/types";

export async function expandDecksIfNeededAction(): Promise<void> {
  const now = new Date().toISOString();

  for (const category of CATEGORIES) {
    // 1. Get all active cards in this category that are due right now
    const dueActiveCards = await db
      .select({ id: cards.id })
      .from(cards)
      .where(
        and(
          eq(cards.deckId, category),
          eq(cards.isActive, true),
          lte(cards.due, now)
        )
      );

    const needed = Math.max(0, MIN_WORDS_PER_CATEGORY - dueActiveCards.length);
    if (needed <= 0) continue;

    // 2. Pull ahead upcoming cards scheduled in the future if needed
    const upcomingCards = await db
      .select({ id: cards.id })
      .from(cards)
      .where(
        and(
          eq(cards.deckId, category),
          eq(cards.isActive, true),
          sql`${cards.due} > ${now}`
        )
      )
      .orderBy(cards.due)
      .limit(needed);

    for (const card of upcomingCards) {
      await db
        .update(cards)
        .set({ due: now })
        .where(eq(cards.id, card.id));
    }
  }
}

export async function createCardAction(data: {
  sentence: string;
  targetChunk: string;
  meaning: string;
  hint?: string | null;
  category: VocabCategory | string;
  sourceContext?: string | null;
}): Promise<{ success: boolean; cardId?: number; error?: string }> {
  try {
    const [inserted] = await db
      .insert(cards)
      .values({
        sentence: data.sentence.trim(),
        targetChunk: data.targetChunk.trim(),
        meaning: data.meaning.trim(),
        hint: data.hint?.trim() || null,
        deckId: data.category,
        sourceContext: data.sourceContext?.trim() || "User Added",
        state: 0, // New
        due: new Date().toISOString(),
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        learningSteps: 0,
        isActive: true,
      })
      .returning({ id: cards.id });

    revalidatePath("/");
    revalidatePath("/decks");
    revalidatePath("/session");

    return { success: true, cardId: inserted.id };
  } catch (error) {
    console.error("Failed to create card:", error);
    return { success: false, error: "Failed to create card." };
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
