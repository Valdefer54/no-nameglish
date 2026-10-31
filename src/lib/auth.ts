import { betterAuth } from "better-auth";
import { createHmac } from "node:crypto";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { db } from "@/lib/db";
import { users, authSessions, accounts, verifications, rateLimits } from "@/lib/db/schema";
import { AUTH_COOKIE_PREFIX, SESSION_DURATION_SECONDS } from "@/lib/auth-policy";

type Database = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export function createAuth(database: Database = db) {
  return betterAuth({
    appName: "no-nameglish",
    baseURL: process.env.BETTER_AUTH_URL,
    // Version the signing key so old seven-day cookies cannot be replayed under a new name.
    secret: process.env.BETTER_AUTH_SECRET
      ? createHmac("sha256", process.env.BETTER_AUTH_SECRET).update(AUTH_COOKIE_PREFIX).digest("base64url")
      : undefined,
    database: drizzleAdapter(database, {
      provider: "pg",
      transaction: true,
      schema: { user: users, session: authSessions, account: accounts, verification: verifications, rateLimit: rateLimits },
    }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128 },
    user: { additionalFields: {
      studyLevel: { type: ["beginner", "advanced"], defaultValue: "beginner", required: true, input: false },
      beginnerLevel: { type: ["A1", "A2", "B1"], defaultValue: "A1", required: true, input: false },
      graduationPending: { type: "boolean", defaultValue: false, required: true, input: false },
    } },
    advanced: { cookiePrefix: AUTH_COOKIE_PREFIX },
    session: {
      expiresIn: SESSION_DURATION_SECONDS,
      disableSessionRefresh: true,
      cookieCache: { enabled: true, strategy: "jwt", maxAge: SESSION_DURATION_SECONDS, refreshCache: false },
    },
    databaseHooks: { session: { create: { before: async (session, context) => {
      // Better Auth otherwise gives rememberMe:false sessions a fixed one-day lifetime.
      let deadline = session.createdAt.getTime() + SESSION_DURATION_SECONDS * 1000;
      // Password changes rotate the token while keeping the original login deadline.
      if (context?.path === "/change-password" && context.context.session) {
        deadline = Math.min(deadline, context.context.session.session.expiresAt.getTime());
      }
      return { data: { ...session, expiresAt: new Date(Math.min(session.expiresAt.getTime(), deadline)) } };
    } } } },
    rateLimit: { enabled: true, storage: "database" },
    disabledPaths: ["/sign-in/email", "/is-username-available", "/update-user"],
    plugins: [admin(), username({ displayUsername: false, immutableUsername: true })],
  });
}

export const auth = createAuth();
