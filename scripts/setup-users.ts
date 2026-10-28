import { setupUsers } from "../src/lib/db/setup-users";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const ownerId = await setupUsers({
    username: process.env.OWNER_USERNAME ?? "",
    name: process.env.OWNER_NAME ?? "",
    password: process.env.OWNER_PASSWORD ?? "",
  });
  console.log("User setup complete. Existing progress was verified unchanged and assigned to the owner. Historical snapshots, when applicable, are in no_nameglish_legacy_backup. Existing passwords were not changed.");
  const [counts] = await db.execute(sql`SELECT
    (SELECT count(*)::integer FROM cards WHERE user_id = ${ownerId}) AS owner_cards,
    (SELECT count(*)::integer FROM sessions WHERE user_id = ${ownerId}) AS owner_study_sessions,
    (SELECT count(*)::integer FROM card_reviews r JOIN sessions s ON s.id = r.session_id WHERE s.user_id = ${ownerId}) AS owner_reviews`);
  console.log("Owner progress after migration:", JSON.stringify(counts));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error instanceof Error ? error.message : "User setup failed");
  process.exit(1);
});
