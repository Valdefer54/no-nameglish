import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  _noNameglishDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createConnection() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL is not set");
  }

  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export const db = globalForDb._noNameglishDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb._noNameglishDb = db;
}
