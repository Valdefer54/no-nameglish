import { db } from "./index";
import { cards } from "./schema";
import { INITIAL_VOCABULARY } from "@/data/initial-vocabulary";
import { users } from "./schema";
import { eq, and } from "drizzle-orm";

async function main() {
  const username = process.env.OWNER_USERNAME?.trim().toLowerCase();
  if (!username) throw new Error("Set OWNER_USERNAME and run db:setup-users first.");
  const [owner] = await db.select().from(users).where(and(eq(users.username, username), eq(users.role, "admin")));
  if (!owner) throw new Error("Run db:setup-users first.");
  console.log("Seeding initial cloze sentence mining cards...");

  for (const card of INITIAL_VOCABULARY) {
    const [existing] = await db.select({ id: cards.id }).from(cards)
      .where(and(eq(cards.userId, owner.id), eq(cards.targetChunk, card.targetChunk)));
    if (!existing) await db.insert(cards).values({ ...card, userId: owner.id });
  }

  console.log(`Inserted ${INITIAL_VOCABULARY.length} cards.`);
  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
