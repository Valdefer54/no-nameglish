import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { setupUsers } from "../src/lib/db/setup-users";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3001";
const ownerUsername = process.env.OWNER_USERNAME ?? "valdefer";
const ownerPassword = process.env.OWNER_PASSWORD ?? "test-owner-password-123";
assert.ok(process.env.TEST_DATABASE_URL?.includes("_test") && process.env.TEST_DATABASE_URL === process.env.POSTGRES_URL,
  "Use a disposable *_test database; TEST_DATABASE_URL must match POSTGRES_URL.");
after(async () => { await db.$client.end(); });

async function post(path: string, body: unknown, cookie = "", clientIP = "192.0.2.10") {
  return fetch(`${baseURL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseURL, cookie, "x-forwarded-for": clientIP },
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

let cachedOwnerCookie = "";
const clientIPs = new Map<string, string>();
async function login(username: string, password: string) {
  if (username === ownerUsername && cachedOwnerCookie) return cachedOwnerCookie;
  if (!clientIPs.has(username)) clientIPs.set(username, `192.0.2.${100 + clientIPs.size}`);
  const response = await post("/api/auth/sign-in/username", { username, password }, "", clientIPs.get(username)!);
  assert.equal(response.status, 200, await response.clone().text());
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  if (username === ownerUsername) cachedOwnerCookie = cookie;
  return cookie;
}

async function action(name: string, args: unknown[], cookie: string) {
  const manifest = JSON.parse(await readFile(".next/dev/server/server-reference-manifest.json", "utf8")) as {
    node: Record<string, { exportedName: string }>;
  };
  const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
  assert.ok(entry, `${name} must be registered after loading /session`);
  const response = await fetch(`${baseURL}/session`, {
    method: "POST", headers: { "content-type": "text/plain;charset=UTF-8", accept: "text/x-component", "next-action": entry[0], origin: baseURL, cookie },
    body: JSON.stringify(args), redirect: "manual",
  });
  const text = await response.text();
  const line = text.split("\n").find((line) => line.startsWith("1:") && !line.startsWith("1:D"));
  return { response, value: line && !line.startsWith("1:E") ? JSON.parse(line.slice(2)) : null, text };
}

test("provisioning preserves legacy progress and can run twice without resetting credentials", async () => {
  const before = await db.execute(sql`SELECT * FROM cards WHERE target_chunk = 'legacy'`);
  const reviews = await db.execute(sql`SELECT * FROM card_reviews WHERE sentence = 'My existing review.'`);
  assert.equal(before.length, 1, "load tests/fixtures/legacy.sql before the first setup");
  assert.equal(reviews.length, 1);
  const owner = { username: ownerUsername, password: "different-password-must-not-reset", name: "Owner" };
  const firstId = await setupUsers(owner);
  assert.equal(await setupUsers(owner), firstId);
  assert.deepEqual(await db.execute(sql`SELECT * FROM cards WHERE target_chunk = 'legacy'`), before);
  assert.deepEqual(await db.execute(sql`SELECT * FROM card_reviews WHERE sentence = 'My existing review.'`), reviews);
  assert.equal(before[0].user_id, firstId);
  const [backup] = await db.execute(sql`SELECT to_regclass('no_nameglish_legacy_backup.cards') AS cards,
    to_regclass('no_nameglish_legacy_backup.sessions') AS sessions,
    to_regclass('no_nameglish_legacy_backup.card_reviews') AS reviews`);
  assert.ok(backup.cards && backup.sessions && backup.reviews, "keep a restorable copy of existing progress before migration");
  const [savedCard] = await db.execute(sql`SELECT state, due, stability, reps FROM no_nameglish_legacy_backup.cards WHERE target_chunk = 'legacy'`);
  assert.equal(savedCard.reps, 9);
  assert.equal(savedCard.stability, 42);
  const savedReviews = await db.execute(sql`SELECT * FROM no_nameglish_legacy_backup.card_reviews WHERE sentence = 'My existing review.'`);
  assert.deepEqual(savedReviews, reviews);
  const counts = await db.execute(sql`SELECT level, count(*)::int AS count FROM vocabulary GROUP BY level ORDER BY level`);
  assert.deepEqual(counts.map((row) => [row.level, row.count]), [["A1", 100], ["A2", 100], ["B1", 100]]);
  await assert.rejects(setupUsers({ ...owner, username: "another_owner" }), /owner already exists/);
});

test("public signup and anonymous account creation are closed", async () => {
  const body = { name: "Stranger", username: "stranger", email: "stranger@example.test", password: ownerPassword };
  assert.notEqual((await post("/api/auth/sign-up/email", body)).status, 200);
  assert.equal((await post("/api/users", body)).status, 401);
  assert.notEqual((await post("/api/auth/admin/create-user", body)).status, 200);
});

test("paid APIs reject anonymous and forged sessions before parsing the body", async () => {
  for (const path of ["/api/feedback", "/api/monologue-feedback", "/api/ai/mine-sentence", "/api/transcribe"]) {
    for (const cookie of ["", "better-auth.session_token=forged"]) {
      const response = await post(path, null, cookie);
      assert.equal(response.status, 401, `${path}: ${await response.text()}`);
    }
  }
});

test("only the owner creates invited accounts; guests start with private decks", async () => {
  const ownerCookie = await login(ownerUsername, ownerPassword);
  const username = `guest_${Date.now()}`;
  const body = { name: "Invited learner", username, password: "guest-password-123", role: "admin" };
  const created = await post("/api/users", body, ownerCookie);
  assert.equal(created.status, 201, await created.clone().text());
  let guestCookie = await login(username, body.password);
  const sessionResponse = await fetch(`${baseURL}/api/auth/get-session`, { headers: { cookie: guestCookie } });
  const session = await sessionResponse.json();
  assert.equal(session.user.role, "user", "input role must not grant admin access");
  assert.equal(session.user.studyLevel, "beginner");
  assert.equal((await post("/api/auth/update-user", { username: null }, guestCookie)).status, 404);
  assert.equal((await post("/api/auth/update-user", { username: "changed_guest" }, guestCookie)).status, 404);
  assert.equal((await post("/api/users", { ...body, username: `other_${username}` }, guestCookie)).status, 403);
  assert.equal((await post("/api/users", body, ownerCookie)).status, 409);
  assert.equal((await post("/api/users", { ...body, username: `weak_${username}`, password: "123" }, ownerCookie)).status, 400);
  assert.equal((await post("/api/users", { ...body, username: `invalid_${username}`, studyLevel: "invalid" }, ownerCookie)).status, 400);
  const crossOrigin = await fetch(`${baseURL}/api/users`, { method: "POST", headers: { "content-type": "application/json", origin: "https://untrusted.example", cookie: ownerCookie }, body: JSON.stringify({ ...body, username: `csrf_${username}` }) });
  assert.equal(crossOrigin.status, 403, "an administrator's cookie does not authorize cross-origin account creation");
  assert.equal((await post("/api/users", { ...body, username: "bad-name" }, ownerCookie)).status, 400);
  const dottedUsername = `.${Date.now()}..`;
  assert.equal((await post("/api/users", { ...body, username: dottedUsername }, ownerCookie)).status, 201);
  assert.ok(await login(dottedUsername, body.password), "permitted dot placement must not break the internal auth identifier");
  const dashboard = await fetch(baseURL, { headers: { cookie: guestCookie } });
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /5 cards due for review/);
  const adminPage = await fetch(`${baseURL}/users`, { headers: { cookie: guestCookie }, redirect: "manual" });
  assert.equal(adminPage.status, 404);

  const otherCookie = await login(username, body.password);
  const changed = await post("/api/auth/change-password", { currentPassword: body.password, newPassword: "changed-guest-password-123", revokeOtherSessions: true }, guestCookie);
  assert.equal(changed.status, 200, await changed.clone().text());
  assert.equal((await post("/api/feedback", null, otherCookie)).status, 401);
  assert.equal((await post("/api/auth/sign-in/username", { username, password: body.password }, "", "192.0.2.50")).status, 401);
  guestCookie = await login(username, "changed-guest-password-123");

  const logout = await post("/api/auth/sign-out", {}, guestCookie);
  assert.equal(logout.status, 200);
  assert.equal((await post("/api/feedback", null, guestCookie)).status, 401);
});

test("server actions cannot read or change another learner's progress, even with guessed IDs", async () => {
  const ownerCookie = await login(ownerUsername, ownerPassword);
  const username = `isolation_${Date.now()}`;
  const created = await post("/api/users", { name: "Beginning learner", username, password: "learner-password-123" }, ownerCookie);
  assert.equal(created.status, 201);
  const guestId = (await created.json()).user.id as string;
  const guestCookie = await login(username, "learner-password-123");
  await fetch(`${baseURL}/session`, { headers: { cookie: guestCookie } });
  const [ownerCard] = await db.execute(sql`SELECT id, reps, stability FROM cards WHERE target_chunk = 'legacy'`);
  const guestCards = await action("getDueCardsAction", [], guestCookie);
  assert.equal(guestCards.response.status, 200, guestCards.text);
  assert.equal(guestCards.value.length, 5);
  assert.ok(guestCards.value.every((card: { userId: string; cefrLevel: string }) => card.userId === guestId && card.cefrLevel === "A1"));
  const stats = await action("getDeckStatsAction", [], guestCookie);
  assert.equal(stats.value.length, 1);
  assert.equal(stats.value[0].totalActive, 300);
  const guestSession = await action("createSessionAction", [], guestCookie);
  const sessionId = guestSession.value.sessionId as number;
  const ownCardId = guestCards.value[0].id as number;
  for (const args of [[sessionId, ownerCard.id, 3, 1000, "Foreign card"], [1, ownCardId, 3, 1000, "Foreign session"]]) {
    const rejected = await action("submitCardReviewAction", args, guestCookie);
    assert.equal(rejected.response.status, 500);
  }
  assert.equal((await action("completeSessionAction", [1, []], guestCookie)).response.status, 500);
  const hiddenSummary = await action("getSessionSummaryAction", [1], guestCookie);
  assert.equal(hiddenSummary.value, null);
  assert.match(hiddenSummary.text, /NEXT_HTTP_ERROR_FALLBACK;404/);
  assert.equal((await fetch(`${baseURL}/session/1/summary`, { headers: { cookie: guestCookie } })).status, 404);
  assert.deepEqual((await db.execute(sql`SELECT id, reps, stability FROM cards WHERE id = ${ownerCard.id}`))[0], ownerCard);
  const args = [sessionId, ownCardId, 3, 1000, "I am learning."];
  assert.equal((await action("submitCardReviewAction", args, guestCookie)).response.status, 200);
  assert.equal((await action("submitCardReviewAction", args, guestCookie)).response.status, 200);
  const [reviewCount] = await db.execute(sql`SELECT count(*)::int AS count FROM card_reviews WHERE session_id = ${sessionId}`);
  assert.equal(reviewCount.count, 1, "retrying a saved review must be idempotent");
  assert.equal((await action("completeSessionAction", [sessionId, [ownerCard.id]], guestCookie)).response.status, 500);
  assert.equal((await action("completeSessionAction", [sessionId, [ownCardId]], guestCookie)).response.status, 200);
  const summary = await action("getSessionSummaryAction", [sessionId], guestCookie);
  assert.equal(summary.value.session.totalCards, 1);
  assert.equal(summary.value.reviews[0].card.userId, guestId);
  assert.equal((await fetch(`${baseURL}/session/${sessionId}/summary`, { headers: { cookie: ownerCookie } })).status, 404);
  const malformed = await post("/api/feedback", null, guestCookie);
  assert.equal(malformed.status, 400);
  for (const [finishedLevel, nextLevel] of [["A1", "A2"], ["A2", "B1"]]) {
    await db.execute(sql`UPDATE cards SET state = 2, due = now() + interval '1 year' WHERE user_id = ${guestId} AND cefr_level = ${finishedLevel}`);
    const next = await action("getDueCardsAction", [], guestCookie);
    assert.ok(next.value.every((card: { cefrLevel: string }) => card.cefrLevel === nextLevel));
    assert.equal(next.value.length, 5);
  }
  await db.execute(sql`UPDATE auth_sessions SET expires_at = now() - interval '1 second' WHERE user_id = ${guestId}`);
  assert.equal((await post("/api/feedback", {}, guestCookie)).status, 401);
});

test("wrong passwords are rejected", async () => {
  assert.equal((await post("/api/auth/sign-in/username", { username: ownerUsername, password: "wrong-password" }, "", "192.0.2.20")).status, 401);
});

test("both vocabulary levels use one server-side DeepSeek key with level-appropriate prompts", async () => {
  const ownerCookie = await login(ownerUsername, ownerPassword);
  const username = `ai_${Date.now()}`;
  assert.equal((await post("/api/users", { name: "AI learner", username, password: "learner-password-123" }, ownerCookie)).status, 201);
  const guestCookie = await login(username, "learner-password-123");
  const { POST } = await import("../src/app/api/ai/mine-sentence/route");
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  const calls: { authorization: string | null; prompt: string }[] = [];
  process.env.DEEPSEEK_API_KEY = "test-shared-deepseek-key";
  globalThis.fetch = async (input, options) => {
    assert.equal(input, "https://api.deepseek.com/chat/completions");
    calls.push({ authorization: new Headers(options?.headers).get("authorization"), prompt: JSON.parse(String(options?.body)).messages[0].content });
    return Response.json({ choices: [{ message: { content: JSON.stringify({ sentence: "I drink {{water}}.", targetChunk: "water", meaning: "agua", hint: "Una bebida.", category: "general" }) } }] });
  };
  try {
    for (const cookie of [ownerCookie, guestCookie]) {
      const response = await POST(new NextRequest(`${baseURL}/api/ai/mine-sentence`, {
        method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ input: "water" }),
      }));
      assert.equal(response.status, 200);
      assert.doesNotMatch(await response.text(), /test-shared-deepseek-key/);
    }
    assert.deepEqual(calls.map((call) => call.authorization), ["Bearer test-shared-deepseek-key", "Bearer test-shared-deepseek-key"]);
    assert.match(calls[0].prompt, /B2-C1/);
    assert.match(calls[1].prompt, /starting from A1 toward B1/);
    assert.match(calls[1].prompt, /Spanish translation/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = originalKey;
  }
});

test("repeated failed logins are rate limited in shared database storage", async () => {
  const attempts = [];
  for (let index = 0; index < 5; index++) {
    attempts.push((await post("/api/auth/sign-in/username", { username: ownerUsername, password: "wrong-password" }, "", "192.0.2.30")).status);
  }
  assert.ok(attempts.includes(401));
  assert.equal(attempts.at(-1), 429);
});
