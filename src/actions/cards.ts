"use server";

import { db } from "@/lib/db";
import { cards, sessions } from "@/lib/db/schema";
import { eq, and, isNotNull, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { dateToISO } from "@/lib/session";
import { CATEGORIES, type VocabCategory } from "@/types";
import { requireUser } from "@/lib/current-user";

export async function createCardAction(data: {
  sentence: string;
  targetChunk: string;
  meaning: string;
  hint?: string | null;
  category: VocabCategory | string;
  sourceContext?: string | null;
}): Promise<{ success: boolean; cardId?: number; error?: string }> {
  const user = await requireUser();
  if (!data || ![data.sentence, data.targetChunk, data.meaning].every((value) => typeof value === "string" && value.trim() && value.length <= 5000) ||
      !CATEGORIES.includes(data.category as VocabCategory) ||
      (data.hint != null && (typeof data.hint !== "string" || data.hint.length > 5000)) ||
      (data.sourceContext != null && (typeof data.sourceContext !== "string" || data.sourceContext.length > 5000))) {
    return { success: false, error: "Please provide a sentence, target word, meaning and valid category." };
  }
  try {
    const [inserted] = await db
      .insert(cards)
      .values({
        userId: user.id,
        cefrLevel: null,
        sentence: data.sentence.trim(),
        targetChunk: data.targetChunk.trim(),
        meaning: data.meaning.trim(),
        hint: data.hint?.trim() || null,
        deckId: user.studyLevel === "beginner" ? "general" : data.category,
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
  const user = await requireUser();
  const dates = await db
    .selectDistinct({ date: sql<string>`date(${sessions.completedAt})` })
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), isNotNull(sessions.completedAt)))
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
