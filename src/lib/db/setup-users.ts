import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "./index";
import { users, accounts, cards, sessions } from "./schema";
import { seedUserCards, seedVocabularyCatalog } from "./vocabulary";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ProgressTable = "cards" | "sessions" | "card_reviews";

async function progressFingerprint(tx: Transaction, table: ProgressTable) {
  const [result] = await tx.execute<{ count: number; digest: string }>(sql`
    SELECT count(*)::integer AS count,
      md5(coalesce(jsonb_agg(to_jsonb(p) - 'user_id' - 'cefr_level' ORDER BY p.id), '[]'::jsonb)::text) AS digest
    FROM public.${sql.identifier(table)} p`);
  return result;
}

async function backupProgress(tx: Transaction) {
  const existing = await tx.execute<{ name: ProgressTable }>(sql`
    SELECT tablename AS name FROM pg_tables
    WHERE schemaname = 'public' AND tablename IN ('cards', 'sessions', 'card_reviews') ORDER BY tablename`);
  if (!existing.length) return [];
  // Keep the original rows stable while copying and assigning their owner.
  await tx.execute(sql`LOCK TABLE ${sql.join(existing.map(({ name }) => sql`public.${sql.identifier(name)}`), sql`, `)} IN ACCESS EXCLUSIVE MODE`);
  await tx.execute(sql`CREATE SCHEMA IF NOT EXISTS no_nameglish_legacy_backup`);
  const snapshots = [];
  for (const { name } of existing) {
    snapshots.push({ name, ...await progressFingerprint(tx, name) });
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS no_nameglish_legacy_backup.${sql.identifier(name)} AS TABLE public.${sql.identifier(name)}`);
  }
  return snapshots;
}

export async function setupUsers(owner: { username: string; name: string; password: string }) {
  const username = owner.username.trim().toLowerCase();
  const email = `${Buffer.from(username).toString("hex")}@accounts.no-nameglish.invalid`;
  if (!/^[a-z0-9_.]{3,30}$/.test(username) || !owner.name.trim() || owner.password.length < 12 || owner.password.length > 128) {
    throw new Error("Set OWNER_USERNAME, OWNER_NAME and OWNER_PASSWORD (12–128 characters) before running setup.");
  }
  const migrations = readMigrationFiles({ migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)) });
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(165042701)`);
    const progressBefore = await backupProgress(tx);
    // Keep Drizzle's migration ledger inside the owner/backfill transaction.
    await tx.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)`);
    const applied = await tx.execute<{ created_at: string }>(sql`SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`);
    for (const migration of migrations) {
      if (Number(applied[0]?.created_at ?? 0) >= migration.folderMillis) continue;
      for (const statement of migration.sql) await tx.execute(sql.raw(statement));
      await tx.execute(sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${migration.hash}, ${migration.folderMillis})`);
    }
    const [existing] = await tx.select().from(users).where(eq(users.username, username));
    let ownerId = existing?.id;
    if (existing && existing.role !== "admin") throw new Error("This username already belongs to a guest; refusing to promote it.");
    if (!existing) {
      const [admin] = await tx.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
      if (admin) throw new Error("An owner already exists. Use the same OWNER_USERNAME when re-running setup.");
      ownerId = randomUUID();
      await tx.insert(users).values({ id: ownerId, email, username, name: owner.name.trim(), role: "admin", studyLevel: "advanced" });
      await tx.insert(accounts).values({
        id: randomUUID(), userId: ownerId, accountId: ownerId, providerId: "credential",
        password: await hashPassword(owner.password),
      });
    }
    if (!ownerId) throw new Error("Owner account was not created.");
    await tx.update(cards).set({ userId: ownerId }).where(isNull(cards.userId));
    await tx.update(sessions).set({ userId: ownerId }).where(isNull(sessions.userId));
    await tx.execute(sql`ALTER TABLE cards ALTER COLUMN user_id SET NOT NULL`);
    await tx.execute(sql`ALTER TABLE sessions ALTER COLUMN user_id SET NOT NULL`);
    for (const previous of progressBefore) {
      const current = await progressFingerprint(tx, previous.name);
      if (current.count !== previous.count || current.digest !== previous.digest) {
        throw new Error(`Progress changed unexpectedly in ${previous.name}; rolling back the entire migration.`);
      }
    }
    await seedVocabularyCatalog(tx);
    const [card] = await tx.select({ id: cards.id }).from(cards).where(eq(cards.userId, ownerId)).limit(1);
    if (!card) await seedUserCards(tx, ownerId, "advanced");
    return ownerId;
  });
}
