import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const globalForDb = globalThis as unknown as {
  _noNameglishDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createConnection() {
  const dbUrl = process.env.DATABASE_URL
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATABASE_URL)
    : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "no-nameglish.db");

  const dir = path.dirname(dbUrl);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbUrl);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

export const db = globalForDb._noNameglishDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb._noNameglishDb = db;
}
