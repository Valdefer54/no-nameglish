import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test, type TestContext } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword } from "better-auth/crypto";

// The real auth configuration is exercised with disposable in-memory storage.
process.env.POSTGRES_URL ??= "postgres://unused:unused@localhost:1/unused_test";
process.env.BETTER_AUTH_URL ??= "https://example.test";
const secret = "test-session-secret-with-at-least-32-characters";
process.env.BETTER_AUTH_SECRET = secret;
const password = "test-learner-password-123";
const passwordHash = hashPassword(password);

async function signIn(t: TestContext, rememberMe?: boolean) {
  const { createAuth } = await import("./auth");
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const now = new Date();
  const store = {
    user: [{ id: "learner", name: "Learner", username: "learner", email: "learner@example.test", emailVerified: false,
      role: "user", studyLevel: "beginner", beginnerLevel: "A1", graduationPending: false, banned: false, createdAt: now, updatedAt: now }],
    account: [{ id: "account", accountId: "learner", userId: "learner", providerId: "credential", password: await passwordHash,
      createdAt: now, updatedAt: now }],
    session: [], verification: [], rateLimit: [],
  };
  const options = { ...createAuth().options, database: memoryAdapter(store),
    baseURL: "https://example.test", rateLimit: { enabled: false } };
  const auth = betterAuth(options);
  const response = await auth.api.signInUsername({ body: { username: "learner", password, rememberMe }, asResponse: true });
  assert.equal(response.status, 200, await response.clone().text());
  const cookies = response.headers.getSetCookie();
  const headers = new Headers({ cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; ") });
  return { auth, cookies, headers, options };
}

test("sign-in issues a signed HttpOnly JWT and a session lasting exactly fifteen minutes", async (t) => {
  const { auth, cookies, headers } = await signIn(t);
  const session = await auth.api.getSession({ headers });
  assert.ok(session);
  assert.equal(session.session.expiresAt.getTime() - session.session.createdAt.getTime(), 900_000);
  const cookie = cookies.find((value) => value.split(";")[0].split("=")[0].endsWith(".session_data"));
  assert.ok(cookie, "sign-in must issue a JWT cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Lax/i);
  const [header, payload, signature] = decodeURIComponent(cookie.split(";")[0].split("=")[1]).split(".");
  assert.equal(JSON.parse(Buffer.from(header, "base64url").toString()).alg, "HS256");
  assert.equal(signature, createHmac("sha256", auth.options.secret!).update(`${header}.${payload}`).digest("base64url"));
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  assert.equal(claims.exp - claims.iat, 900);
});

test("activity does not extend the session and replaying its cookies after fifteen minutes fails", async (t) => {
  const { auth, headers } = await signIn(t);
  const original = await auth.api.getSession({ headers });
  assert.ok(original);
  t.mock.timers.setTime(original.session.createdAt.getTime() + 899_000);
  const active = await auth.api.getSession({ headers });
  assert.equal(active?.session.expiresAt.getTime(), original.session.expiresAt.getTime());
  t.mock.timers.tick(1_001);
  assert.equal(await auth.api.getSession({ headers }), null);
  assert.equal(await auth.api.getSession({ headers, query: { disableCookieCache: true } }), null);
});

test("disabling remember-me cannot bypass the fifteen-minute deadline", async (t) => {
  const { auth, headers } = await signIn(t, false);
  const original = await auth.api.getSession({ headers });
  assert.ok(original);
  assert.equal(original.session.expiresAt.getTime() - original.session.createdAt.getTime(), 900_000);
  t.mock.timers.tick(900_001);
  assert.equal(await auth.api.getSession({ headers, query: { disableCookieCache: true } }), null);
});

test("a fresh login is required to get a new session after expiration", async (t) => {
  const { auth, headers } = await signIn(t);
  const original = await auth.api.getSession({ headers });
  assert.ok(original);
  t.mock.timers.setTime(original.session.createdAt.getTime() + 900_001);
  assert.equal(await auth.api.getSession({ headers }), null);
  const response = await auth.api.signInUsername({ body: { username: "learner", password }, asResponse: true });
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  const renewed = await auth.api.getSession({ headers: new Headers({ cookie: cookies }) });
  assert.ok(renewed);
  assert.notEqual(renewed.session.token, original.session.token);
  assert.equal(renewed.session.expiresAt.getTime() - renewed.session.createdAt.getTime(), 900_000);
});

test("changing a password rotates the token without extending the original login deadline", async (t) => {
  const { auth, headers } = await signIn(t);
  const original = await auth.api.getSession({ headers });
  assert.ok(original);
  t.mock.timers.setTime(original.session.createdAt.getTime() + 840_000);
  const response = await auth.api.changePassword({ headers, body: {
    currentPassword: password, newPassword: "new-learner-password-123", revokeOtherSessions: true,
  }, asResponse: true });
  assert.equal(response.status, 200, await response.clone().text());
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const rotatedHeaders = new Headers({ cookie });
  const rotated = await auth.api.getSession({ headers: rotatedHeaders });
  assert.ok(rotated);
  assert.notEqual(rotated.session.token, original.session.token);
  assert.equal(rotated.session.expiresAt.getTime(), original.session.expiresAt.getTime());
  t.mock.timers.tick(60_001);
  assert.equal(await auth.api.getSession({ headers: rotatedHeaders }), null);
});

test("renaming a legacy seven-day cookie cannot authenticate under the new session policy", async (t) => {
  const { auth, options } = await signIn(t);
  const legacy = betterAuth({ ...options, secret, advanced: { cookiePrefix: "better-auth" },
    session: { expiresIn: 604800 }, databaseHooks: undefined });
  const response = await legacy.api.signInUsername({ body: { username: "learner", password }, asResponse: true });
  assert.equal(response.status, 200);
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0])
    .join("; ").replaceAll("better-auth.", "no-nameglish-15m.");
  t.mock.timers.tick(86_400_000);
  assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }), query: { disableCookieCache: true } }), null);
});
