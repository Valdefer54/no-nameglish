import { db } from "./index";
import { vocabularyWords, cards } from "./schema";
import { INITIAL_VOCABULARY } from "@/data/initial-vocabulary";
import { newCardDefaults } from "@/lib/fsrs";
import { eq, and } from "drizzle-orm";
import { CATEGORIES } from "@/types";

const INITIAL_ACTIVE_PER_DECK = 5;

async function main() {
  console.log("Seeding vocabulary words...");

  for (const word of INITIAL_VOCABULARY) {
    await db.insert(vocabularyWords).values(word).onConflictDoNothing();
  }

  console.log(`Inserted ${INITIAL_VOCABULARY.length} words.`);
  console.log(`Activating first ${INITIAL_ACTIVE_PER_DECK} cards per deck...`);

  for (const category of CATEGORIES) {
    const wordsInDeck = await db
      .select()
      .from(vocabularyWords)
      .where(eq(vocabularyWords.category, category))
      .limit(INITIAL_ACTIVE_PER_DECK);

    for (const word of wordsInDeck) {
      const existing = await db
        .select({ id: cards.id })
        .from(cards)
        .where(and(eq(cards.wordId, word.id)));

      if (existing.length > 0) continue;

      await db.insert(cards).values({
        wordId: word.id,
        category,
        ...newCardDefaults(),
        isActive: true,
      });
    }

    console.log(`  ${category}: ${wordsInDeck.length} cards activated.`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
