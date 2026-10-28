import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { db } from "@/lib/db";
import { users, authSessions, accounts, verifications, rateLimits } from "@/lib/db/schema";

type Database = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export function createAuth(database: Database = db) {
  return betterAuth({
    appName: "no-nameglish",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(database, {
      provider: "pg",
      transaction: true,
      schema: { user: users, session: authSessions, account: accounts, verification: verifications, rateLimit: rateLimits },
    }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128 },
    user: { additionalFields: { studyLevel: { type: ["beginner", "advanced"], defaultValue: "beginner", required: true, input: false } } },
    session: { expiresIn: 60 * 60 * 24 * 7 },
    rateLimit: { enabled: true, storage: "database" },
    disabledPaths: ["/sign-in/email", "/is-username-available", "/update-user"],
    plugins: [admin(), username({ displayUsername: false, immutableUsername: true })],
  });
}

export const auth = createAuth();
