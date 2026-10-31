"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cards, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/current-user";
import { getBeginnerProgress } from "@/lib/vocabulary-progress";

export async function getVocabularyProgressAction() {
  const user = await requireUser();
  const rows = await db.select().from(cards).where(and(eq(cards.userId, user.id), eq(cards.isActive, true)));
  return { ...getBeginnerProgress(rows), studyLevel: user.studyLevel, currentLevel: user.beginnerLevel };
}

export async function acknowledgeGraduationAction() {
  const user = await requireUser();
  await db.update(users).set({ graduationPending: false }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
}
