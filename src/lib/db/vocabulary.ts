import { sql } from "drizzle-orm";
import type { db } from "./index";
import { cards, vocabulary } from "./schema";
import { INITIAL_VOCABULARY } from "@/data/initial-vocabulary";
import { BEGINNER_VOCABULARY } from "@/data/beginner-vocabulary";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function seedVocabularyCatalog(tx: Transaction) {
  await tx.insert(vocabulary).values(BEGINNER_VOCABULARY).onConflictDoUpdate({
    target: vocabulary.word,
    set: { level: sql`excluded.level`, topic: sql`excluded.topic`, sentence: sql`excluded.sentence`, meaning: sql`excluded.meaning`, hint: sql`excluded.hint` },
  });
}

export async function seedUserCards(tx: Transaction, userId: string, studyLevel: "beginner" | "advanced") {
  const due = new Date().toISOString();
  if (studyLevel === "advanced") {
    await tx.insert(cards).values(INITIAL_VOCABULARY.map((card) => ({ ...card, userId, due, cefrLevel: "B2-C1" })));
    return;
  }
  const words = await tx.select().from(vocabulary);
  if (!words.length) throw new Error("Vocabulary catalog is empty. Run db:setup-users before creating accounts.");
  await tx.insert(cards).values(words.map((word) => ({
    userId, due, deckId: "general", cefrLevel: word.level, sentence: word.sentence,
    targetChunk: word.word, meaning: word.meaning, hint: word.hint,
    sourceContext: `${word.level} · ${word.topic}`,
  })));
}
