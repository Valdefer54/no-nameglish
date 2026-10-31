import assert from "node:assert/strict";
import { test } from "node:test";
import { BEGINNER_VOCABULARY } from "@/data/beginner-vocabulary";
import { getBeginnerProgress, getNextStudyLevel, getStudyCards } from "./vocabulary-progress";

function catalogue() {
  return BEGINNER_VOCABULARY.map((word, index) => ({ id: index + 1, targetChunk: word.word,
    cefrLevel: word.level, deckId: "general", state: 0, reps: 0, stability: 0,
    isActive: true, due: "2026-01-01T12:00:00.000Z" }));
}

function finishLevel(rows: ReturnType<typeof catalogue>, level: string, mature = 80) {
  let index = 0;
  for (const card of rows.filter((card) => card.cefrLevel === level)) {
    Object.assign(card, { state: 2, reps: 5, stability: index++ < mature ? 22 : 10 });
  }
}

test("A1 unlocks A2 only after all 100 words are studied and at least 80 are mature", () => {
  const cards = catalogue();
  finishLevel(cards, "A1", 79);
  assert.equal(getNextStudyLevel("A1", cards), "A1");
  cards[79].stability = 22;
  assert.equal(getNextStudyLevel("A1", cards), "A2");
  cards[99].reps = 0;
  cards[99].state = 0;
  assert.equal(getNextStudyLevel("A1", cards), "A1");
});

test("missing, inactive or duplicate words cannot make an incomplete level pass", () => {
  const cards = catalogue();
  finishLevel(cards, "A1", 100);
  const incomplete = cards.filter((card) => card.id !== 100);
  incomplete.push({ ...cards[0], id: 999 });
  assert.equal(getBeginnerProgress(incomplete).levels[0].studied, 99);
  assert.equal(getNextStudyLevel("A1", incomplete), "A1");
  cards[99].isActive = false;
  assert.equal(getNextStudyLevel("A1", cards), "A1");
});

test("unlocked levels do not regress when an earlier word is forgotten", () => {
  const cards = catalogue();
  assert.equal(getNextStudyLevel("A2", cards), "A2");
  finishLevel(cards, "A2");
  assert.equal(getNextStudyLevel("A2", cards), "B1");
});

test("graduation requires all 300 words studied and 80 percent of the full group mature", () => {
  const cards = catalogue();
  for (const level of ["A1", "A2", "B1"]) finishLevel(cards, level);
  assert.equal(getNextStudyLevel("A1", cards), "B2-C1");
  cards[0].stability = 0;
  assert.equal(getNextStudyLevel("B1", cards), "B1");
});

test("new words follow catalogue order and future levels stay locked even without due A1 cards", () => {
  const cards = catalogue().reverse();
  const selected = getStudyCards(cards, "beginner", "A1", new Date("2026-02-01"));
  assert.deepEqual(selected.map((card) => card.targetChunk), ["mother", "father", "sister", "brother", "son", "daughter", "baby", "family", "friend", "name"]);
  for (const card of cards.filter((card) => card.cefrLevel === "A1")) card.due = "2027-01-01";
  assert.deepEqual(getStudyCards(cards, "beginner", "A1", new Date("2026-02-01")), []);
});

test("A2 sessions keep due A1 reviews, exclude B1 and remain capped at ten cards", () => {
  const cards = catalogue();
  finishLevel(cards, "A1", 100);
  for (const card of cards.filter((card) => card.cefrLevel === "A1")) card.due = "2027-01-01";
  cards[0].due = "2026-01-01";
  const selected = getStudyCards(cards, "beginner", "A2", new Date("2026-02-01"));
  assert.equal(selected.length, 10);
  assert.equal(selected[0].targetChunk, "mother");
  assert.ok(selected.slice(1).every((card) => card.cefrLevel === "A2"));
});

test("advanced users retain the existing five-card limit for each category", () => {
  const cards = catalogue().slice(0, 20).map((card, index) => ({ ...card, cefrLevel: "B2-C1",
    deckId: index < 10 ? "general" : "precision-verbs" }));
  const selected = getStudyCards(cards, "advanced", "B1", new Date("2026-02-01"));
  assert.equal(selected.length, 10);
  assert.equal(selected.filter((card) => card.deckId === "general").length, 5);
});

test("three due advanced reviews are completed with two new cards without pulling future reviews forward", () => {
  const cards = catalogue().slice(0, 10).map((card) => ({ ...card, cefrLevel: "B2-C1" }));
  for (let index = 0; index < 3; index++) Object.assign(cards[index], { state: 2, reps: 5, stability: 22 });
  Object.assign(cards[3], { state: 2, reps: 5, stability: 22, due: "2026-02-06T12:00:00.000Z" });
  const selected = getStudyCards(cards, "advanced", "B1", new Date("2026-02-03T12:00:00Z"));
  assert.deepEqual(selected.map((card) => card.id), [1, 2, 3, 5, 6]);
  assert.equal(cards[3].due, "2026-02-06T12:00:00.000Z");
});

test("five reviews per advanced category is a daily limit across sessions", () => {
  const cards = catalogue().slice(0, 12).map((card) => ({ ...card, cefrLevel: "B2-C1" }));
  const budget = { counts: { general: 3 }, reviewedIds: new Set([1, 2, 3]) };
  assert.deepEqual(getStudyCards(cards, "advanced", "B1", new Date("2026-02-03"), budget).map((card) => card.id), [4, 5]);
  budget.counts.general = 5;
  assert.deepEqual(getStudyCards(cards, "advanced", "B1", new Date("2026-02-03"), budget), []);
});

test("overdue backlog stays due for tomorrow and gets priority when the daily budget resets", () => {
  const cards = catalogue().slice(0, 9).map((card, index) => ({ ...card, cefrLevel: "B2-C1",
    state: index < 7 ? 2 : 0, due: `2026-02-0${index < 7 ? 1 : 3}T12:00:00.000Z` }));
  const budget = { counts: { general: 5 }, reviewedIds: new Set([1, 2, 3, 4, 5]) };
  for (const card of cards.slice(0, 5)) card.due = "2026-03-01";
  assert.deepEqual(getStudyCards(cards, "advanced", "B1", new Date("2026-02-06"), budget), []);
  assert.equal(cards[5].due, "2026-02-01T12:00:00.000Z");
  const nextDay = getStudyCards(cards, "advanced", "B1", new Date("2026-02-07"));
  assert.deepEqual(nextDay.map((card) => card.id), [6, 7, 8, 9]);
});

test("beginner vocabulary keeps its separate ten-card daily limit", () => {
  const cards = catalogue();
  const budget = { counts: { general: 9 }, reviewedIds: new Set(Array.from({ length: 9 }, (_, index) => index + 1)) };
  assert.deepEqual(getStudyCards(cards, "beginner", "A1", new Date("2026-02-03"), budget).map((card) => card.id), [10]);
  budget.counts.general = 10;
  assert.deepEqual(getStudyCards(cards, "beginner", "A1", new Date("2026-02-03"), budget), []);
});
