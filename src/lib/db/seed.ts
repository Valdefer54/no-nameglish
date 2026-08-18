import { db } from "./index";
import { cards } from "./schema";
import { INITIAL_VOCABULARY } from "@/data/initial-vocabulary";

async function main() {
  console.log("Seeding initial cloze sentence mining cards...");

  for (const card of INITIAL_VOCABULARY) {
    await db.insert(cards).values(card).onConflictDoNothing();
  }

  console.log(`Inserted ${INITIAL_VOCABULARY.length} cards.`);
  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
