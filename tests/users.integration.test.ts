import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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
  const manifest = JSON.parse(await readFile(process.env.TEST_SERVER_REFERENCE_MANIFEST ?? ".next/dev/server/server-reference-manifest.json", "utf8")) as {
    node: Record<string, { exportedName: string; workers: Record<string, unknown> }>;
  };
  const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
  assert.ok(entry, `${name} must be registered after loading /session`);
  const workers = Object.keys(entry[1].workers);
  const worker = workers.find((path) => path === "app/session/page") ?? workers.find((path) => path === "app/page") ?? workers.find((path) => path.endsWith("/page"));
  assert.ok(worker, `${name} must have a page worker`);
  const pathname = worker === "app/page" ? "/" : worker.replace(/^app/, "").replace(/\/page$/, "").replaceAll("[id]", "1");
  const response = await fetch(`${baseURL}${pathname}`, {
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
    for (const cookie of ["", "better-auth.session_token=forged", "no-nameglish-15m.session_token=forged"]) {
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
  assert.match(await dashboard.text(), /10 cards due for review/);
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
  assert.equal(guestCards.value.length, 10);
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
    await db.execute(sql`UPDATE cards SET state = 2, reps = 5, stability = 22, due = now() + interval '1 year' WHERE user_id = ${guestId} AND cefr_level = ${finishedLevel}`);
    const next = await action("getDueCardsAction", [], guestCookie);
    assert.ok(next.value.every((card: { cefrLevel: string }) => card.cefrLevel === nextLevel));
    assert.equal(next.value.length, 9, "one of today's ten beginner slots was already reviewed");
  }
  await db.execute(sql`UPDATE auth_sessions SET expires_at = now() - interval '1 second' WHERE user_id = ${guestId}`);
  assert.equal((await post("/api/feedback", {}, guestCookie)).status, 401);
});

test("beginner levels unlock in order and graduation preserves progress and seeds advanced vocabulary exactly once", async () => {
  const ownerCookie = await login(ownerUsername, ownerPassword);
  const username = `progress_${Date.now()}`;
  const created = await post("/api/users", { name: "Progress learner", username, password: "learner-password-123" }, ownerCookie);
  assert.equal(created.status, 201, await created.clone().text());
  const { user: { id: userId } } = await created.json();
  const cookie = await login(username, "learner-password-123");
  await fetch(`${baseURL}/session`, { headers: { cookie } });
  const initial = await action("getDueCardsAction", [], cookie);
  assert.deepEqual(initial.value.map((card: { targetChunk: string }) => card.targetChunk),
    ["mother", "father", "sister", "brother", "son", "daughter", "baby", "family", "friend", "name"]);
  const studySession = await action("createSessionAction", [], cookie);
  const [locked] = await db.execute(sql`SELECT id FROM cards WHERE user_id = ${userId} AND cefr_level = 'B1' LIMIT 1`);
  assert.equal((await action("submitCardReviewAction", [studySession.value.sessionId, locked.id, 3, 1000, "Locked word."], cookie)).response.status, 500);
  await db.execute(sql`UPDATE cards SET due = now() + interval '1 year' WHERE user_id = ${userId} AND cefr_level = 'A1'`);
  assert.deepEqual((await action("getDueCardsAction", [], cookie)).value, [], "future reviews must not unlock A2");

  for (const [level, next] of [["A1", "A2"], ["A2", "B1"]]) {
    await db.execute(sql`UPDATE cards SET state = 2, reps = 5, stability = 10, due = now() + interval '1 year' WHERE user_id = ${userId} AND cefr_level = ${level}`);
    await db.execute(sql`UPDATE cards SET stability = 22 WHERE id IN (SELECT id FROM cards WHERE user_id = ${userId} AND cefr_level = ${level} ORDER BY id LIMIT 80)`);
    const due = await action("getDueCardsAction", [], cookie);
    assert.equal(due.value.length, 10);
    assert.ok(due.value.every((card: { cefrLevel: string }) => card.cefrLevel === next));
  }
  await db.execute(sql`UPDATE cards SET stability = 0 WHERE id = (SELECT id FROM cards WHERE user_id = ${userId} AND cefr_level = 'A1' ORDER BY id LIMIT 1)`);
  await db.execute(sql`UPDATE cards SET state = 2, reps = 5, stability = 10, due = now() + interval '1 year' WHERE user_id = ${userId} AND cefr_level = 'B1'`);
  await db.execute(sql`UPDATE cards SET stability = 22 WHERE id IN (SELECT id FROM cards WHERE user_id = ${userId} AND cefr_level = 'B1' ORDER BY id LIMIT 80)`);
  await action("getDueCardsAction", [], cookie);
  const [notYet] = await db.execute(sql`SELECT study_level, beginner_level FROM users WHERE id = ${userId}`);
  assert.equal(notYet.study_level, "beginner");
  assert.equal(notYet.beginner_level, "B1", "an earlier lapse must not relock levels");
  await db.execute(sql`UPDATE cards SET stability = 22 WHERE id = (SELECT id FROM cards WHERE user_id = ${userId} AND cefr_level = 'A1' ORDER BY id LIMIT 1)`);
  const before = await db.execute(sql`SELECT * FROM cards WHERE user_id = ${userId} ORDER BY id`);
  const promotions = await Promise.all([action("getDueCardsAction", [], cookie), action("getDueCardsAction", [], cookie)]);
  assert.ok(promotions.every((result) => result.value.length === 25));
  const [promoted] = await db.execute(sql`SELECT study_level, graduation_pending FROM users WHERE id = ${userId}`);
  assert.equal(promoted.study_level, "advanced");
  assert.equal(promoted.graduation_pending, true);
  assert.deepEqual(await db.execute(sql`SELECT * FROM cards WHERE user_id = ${userId} AND cefr_level IN ('A1', 'A2', 'B1') ORDER BY id`), before);
  const [advanced] = await db.execute(sql`SELECT count(*)::int AS count, count(DISTINCT target_chunk)::int AS unique_count FROM cards WHERE user_id = ${userId} AND cefr_level = 'B2-C1'`);
  assert.equal(advanced.count, 100);
  assert.equal(advanced.unique_count, 100);
  await db.execute(sql`UPDATE cards SET due = now() + interval '2 years' WHERE user_id = ${userId} AND cefr_level = 'B2-C1' AND deck_id = 'general'`);
  assert.match(await (await fetch(`${baseURL}/`, { headers: { cookie } })).text(), /¡Felicitaciones!/);
  assert.deepEqual(await db.execute(sql`SELECT * FROM cards WHERE user_id = ${userId} AND cefr_level IN ('A1', 'A2', 'B1') ORDER BY id`), before,
    "opening the advanced dashboard must preserve the original beginner review dates");
  await action("acknowledgeGraduationAction", [], ownerCookie);
  const [stillPending] = await db.execute(sql`SELECT graduation_pending FROM users WHERE id = ${userId}`);
  assert.equal(stillPending.graduation_pending, true, "one user cannot dismiss another user's notice");
  const acknowledged = await action("acknowledgeGraduationAction", [], cookie);
  assert.equal(acknowledged.response.status, 200, acknowledged.text);
  const [dismissed] = await db.execute(sql`SELECT graduation_pending FROM users WHERE id = ${userId}`);
  assert.equal(dismissed.graduation_pending, false);
});

test("wrong passwords are rejected", async () => {
  assert.equal((await post("/api/auth/sign-in/username", { username: ownerUsername, password: "wrong-password" }, "", "192.0.2.20")).status, 401);
});

test("retrying session creation after a lost response reuses the same private session", async () => {
  const ownerCookie = await login(ownerUsername, ownerPassword);
  await fetch(`${baseURL}/session`, { headers: { cookie: ownerCookie } });
  const requestId = randomUUID();
  const responses = await Promise.all([
    action("createSessionAction", [requestId], ownerCookie),
    action("createSessionAction", [requestId], ownerCookie),
  ]);
  assert.ok(responses.every((result) => result.response.status === 200));
  assert.equal(responses[0].value.sessionId, responses[1].value.sessionId);
  const replay = await action("createSessionAction", [requestId], ownerCookie);
  assert.equal(replay.value.sessionId, responses[0].value.sessionId);
  const invalid = await action("createSessionAction", ["invalid-request-id"], ownerCookie);
  assert.equal(invalid.value?.sessionId, undefined);
  assert.match(invalid.text, /1:E/, "the invalid request must return an action error");
  const username = `retry_${Date.now()}`;
  const created = await post("/api/users", { name: "Retry learner", username, password: "learner-password-123" }, ownerCookie);
  assert.equal(created.status, 201);
  const { user: { id: userId } } = await created.json();
  const cookie = await login(username, "learner-password-123");
  const other = await action("createSessionAction", [requestId], cookie);
  assert.notEqual(other.value.sessionId, responses[0].value.sessionId);
  const [record] = await db.execute(sql`SELECT user_id FROM sessions WHERE id = ${other.value.sessionId}`);
  assert.equal(record.user_id, userId);
});

test("HTTP study initialization validates requests, returns the same session on retry and creates no empty sessions", async () => {
  const ownerCookie = await login(ownerUsername, ownerPassword);
  const username = `http_${Date.now()}`;
  const created = await post("/api/users", { name: "HTTP learner", username, password: "learner-password-123" }, ownerCookie);
  assert.equal(created.status, 201);
  const { user: { id: userId } } = await created.json();
  const cookie = await login(username, "learner-password-123");
  assert.equal((await post("/api/study-session", { requestId: randomUUID() })).status, 401);
  assert.equal((await post("/api/study-session", { requestId: "invalid" }, cookie)).status, 400);
  assert.equal((await fetch(`${baseURL}/api/study-session`, { method: "POST", headers: {
    cookie, "content-type": "application/json", origin: "https://foreign.example.test",
  }, body: JSON.stringify({ requestId: randomUUID() }) })).status, 403);
  const requestId = randomUUID();
  const responses = await Promise.all([
    post("/api/study-session", { requestId }, cookie), post("/api/study-session", { requestId }, cookie),
  ]);
  assert.ok(responses.every((response) => response.status === 200));
  const [first, second] = await Promise.all(responses.map((response) => response.json()));
  assert.equal(first.sessionId, second.sessionId);
  assert.equal(first.cards.length, 10);
  const [before] = await db.execute(sql`SELECT count(*)::int AS count FROM sessions WHERE user_id = ${userId}`);
  assert.equal(before.count, 1);
  await db.execute(sql`UPDATE cards SET due = now() + interval '2 days' WHERE user_id = ${userId} AND cefr_level = 'A1'`);
  const empty = await post("/api/study-session", { requestId: randomUUID() }, cookie);
  assert.deepEqual(await empty.json(), { sessionId: null, cards: [] });
  const [after] = await db.execute(sql`SELECT count(*)::int AS count FROM sessions WHERE user_id = ${userId}`);
  assert.equal(after.count, 1);
  const complete = (authCookie: string) => fetch(`${baseURL}/api/study-session`, {
    method: "PATCH", headers: { cookie: authCookie, origin: baseURL, "content-type": "application/json" },
    body: JSON.stringify({ sessionId: first.sessionId, worstCardIds: [] }),
  });
  assert.equal((await complete("")).status, 401);
  assert.equal((await complete(ownerCookie)).status, 503, "another account cannot complete this session");
  assert.equal((await complete(cookie)).status, 200);
  const [finished] = await db.execute(sql`SELECT completed_at FROM sessions WHERE id = ${first.sessionId}`);
  assert.ok(finished.completed_at);
});

test("advanced daily quotas keep future dates, fill with new words, prevent concurrent overflow and carry backlog to the next day", async () => {
  const ownerCookie = await login(ownerUsername, ownerPassword);
  const username = `quota_${Date.now()}`;
  const created = await post("/api/users", { name: "Quota learner", username, password: "learner-password-123", studyLevel: "advanced" }, ownerCookie);
  assert.equal(created.status, 201);
  const { user: { id: userId } } = await created.json();
  const cookie = await login(username, "learner-password-123");
  await db.execute(sql`UPDATE cards SET is_active = (deck_id = 'general') WHERE user_id = ${userId}`);
  const general = await db.execute<{ id: number }>(sql`SELECT id FROM cards WHERE user_id = ${userId} AND deck_id = 'general' ORDER BY id`);
  const reviewIds = general.slice(0, 3).map((card) => card.id);
  await db.execute(sql`UPDATE cards SET state = 2, reps = 5, stability = 22, difficulty = 5, last_review = now() - interval '1 day', due = now() - interval '1 day'
    WHERE id IN (${sql.join(reviewIds.map((id) => sql`${id}`), sql`, `)})`);
  const futureId = general[3].id;
  await db.execute(sql`UPDATE cards SET state = 2, reps = 5, stability = 22, difficulty = 5, due = now() + interval '2 days' WHERE id = ${futureId}`);
  const [futureBefore] = await db.execute(sql`SELECT due FROM cards WHERE id = ${futureId}`);
  const started = await post("/api/study-session", { requestId: randomUUID() }, cookie);
  assert.equal(started.status, 200);
  const initial = await started.json();
  assert.equal(initial.cards.length, 5);
  assert.deepEqual(initial.cards.slice(0, 3).map((card: { id: number }) => card.id), reviewIds);
  assert.ok(initial.cards.slice(3).every((card: { state: number }) => card.state === 0));
  assert.ok(initial.cards.every((card: { id: number }) => card.id !== futureId));
  await fetch(`${baseURL}/session`, { headers: { cookie } });
  const early = await action("submitCardReviewAction", [initial.sessionId, futureId, 3, 1000, "Too early."], cookie);
  assert.match(early.text, /1:E/, "a known future card cannot be reviewed before its date");
  for (const card of initial.cards.slice(0, 4)) {
    const saved = await action("submitCardReviewAction", [initial.sessionId, card.id, 3, 1000, "A daily review."], cookie);
    assert.equal(saved.response.status, 200, saved.text);
  }
  const otherSession = await action("createSessionAction", [randomUUID()], cookie);
  const alreadyReviewed = await action("submitCardReviewAction", [otherSession.value.sessionId, initial.cards[0].id, 3, 1000, "Other tab."], cookie);
  assert.equal(alreadyReviewed.value.error, "already-reviewed");
  const extraId = general[6].id;
  const candidates = [initial.cards[4].id, extraId];
  const saved = await Promise.all(candidates.map((id) => action("submitCardReviewAction", [initial.sessionId, id, 3, 1000, "Concurrent last slot."], cookie)));
  assert.equal(saved.filter((result) => result.value?.error === "daily-limit").length, 1);
  const [count] = await db.execute(sql`SELECT count(*)::int AS count FROM card_reviews WHERE session_id = ${initial.sessionId}`);
  assert.equal(count.count, 5);
  const exhausted = await post("/api/study-session", { requestId: randomUUID() }, cookie);
  assert.deepEqual(await exhausted.json(), { sessionId: null, cards: [] });
  assert.deepEqual((await db.execute(sql`SELECT due FROM cards WHERE id = ${futureId}`))[0], futureBefore);
  const { getDailyReviewBudget } = await import("../src/lib/db/daily-reviews");
  const { cards: cardTable } = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const { getStudyCards } = await import("../src/lib/vocabulary-progress");
  const later = new Date(Date.now() + 3 * 86_400_000);
  const rows = await db.select().from(cardTable).where(eq(cardTable.userId, userId));
  const next = getStudyCards(rows, "advanced", "B1", later, await getDailyReviewBudget(userId, later));
  assert.ok(next.some((card) => card.id === futureId), "future review becomes available after its actual due date");
  await db.execute(sql`UPDATE cards SET state = 2, reps = 5, stability = 22, due = now() - interval '1 day' WHERE user_id = ${userId} AND deck_id = 'general'`);
  const backlog = await action("getDueCardsAction", [], cookie);
  assert.deepEqual(backlog.value, [], "opening another session cannot bypass the exhausted quota");
  await db.execute(sql`UPDATE card_reviews SET reviewed_at = reviewed_at - interval '1 day' WHERE session_id = ${initial.sessionId}`);
  const freshDay = await action("getDueCardsAction", [], cookie);
  assert.equal(freshDay.value.length, 5);
  assert.ok(freshDay.value.every((card: { state: number }) => card.state === 2), "overdue reviews take priority over new words");
  await db.execute(sql`UPDATE card_reviews SET reviewed_at = CASE
    WHEN id = (SELECT min(id) FROM card_reviews WHERE session_id = ${initial.sessionId}) THEN '2026-10-29T05:00:00Z'::timestamptz
    ELSE '2026-10-29T04:59:59Z'::timestamptz END WHERE session_id = ${initial.sessionId}`);
  assert.equal((await getDailyReviewBudget(userId, new Date("2026-10-29T04:59:59.500Z"))).counts.general, 4);
  assert.equal((await getDailyReviewBudget(userId, new Date("2026-10-29T05:00:00.000Z"))).counts.general, 1);
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
