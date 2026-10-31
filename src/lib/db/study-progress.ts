import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { cards, users } from "./schema";
import { seedUserCards } from "./vocabulary";
import { getNextStudyLevel } from "@/lib/vocabulary-progress";

export async function syncStudyProgress(userId: string) {
  return db.transaction(async (tx) => {
    // Serialize milestone updates and advanced seeding for this learner.
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user) throw new Error("User not found");
    let { studyLevel, beginnerLevel, graduationPending } = user;
    if (studyLevel === "beginner") {
      const vocabulary = await tx.select().from(cards).where(and(eq(cards.userId, userId), eq(cards.isActive, true)));
      const next = getNextStudyLevel(beginnerLevel, vocabulary);
      if (next === "B2-C1") {
        await seedUserCards(tx, userId, "advanced");
        studyLevel = "advanced";
        graduationPending = true;
      } else {
        beginnerLevel = next;
      }
      if (studyLevel !== user.studyLevel || beginnerLevel !== user.beginnerLevel) {
        await tx.update(users).set({ studyLevel, beginnerLevel, graduationPending }).where(eq(users.id, userId));
      }
    }
    return { studyLevel, beginnerLevel, graduationPending };
  });
}
