import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computePerformanceScore,
  findWorstThreeCards,
  isMatureCard,
  countLearningCards,
  learningSlotsToFill,
  dateToISO,
  ACTIVE_LEARNING_TARGET,
} from "./index";
import { newCardDefaults } from "@/lib/fsrs";
import type { ReviewResult } from "@/types";

const learning = { stability: 2, reps: 1 };
const mature = { stability: 30, reps: 8 };

function review(overrides: Partial<ReviewResult> = {}): ReviewResult {
  return {
    cardId: 1,
    word: "however",
    rating: 3,
    responseTimeMs: 5000,
    sentence: "However, the plan failed.",
    ...overrides,
  };
}

describe("computePerformanceScore", () => {
  test("maps rating 1-4 onto a 0-100 base when answered quickly", () => {
    assert.equal(computePerformanceScore(1, 0), 0);
    assert.equal(computePerformanceScore(4, 0), 100);
    assert.ok(Math.abs(computePerformanceScore(3, 0) - 66.67) < 0.01);
  });

  test("applies no time penalty at or under 30 seconds", () => {
    assert.equal(computePerformanceScore(4, 30), 100);
    assert.equal(computePerformanceScore(4, 10), 100);
  });

  test("penalises half a point per second beyond 30", () => {
    assert.equal(computePerformanceScore(4, 40), 95);
    assert.equal(computePerformanceScore(4, 60), 85);
  });

  test("caps the time penalty at 30 points so slow answers stay comparable", () => {
    assert.equal(computePerformanceScore(4, 90), 70);
    assert.equal(computePerformanceScore(4, 600), 70);
  });
});

describe("findWorstThreeCards", () => {
  test("returns the three lowest-scoring cards, worst first", () => {
    const worst = findWorstThreeCards([
      review({ cardId: 1, rating: 4, responseTimeMs: 1000 }),
      review({ cardId: 2, rating: 1, responseTimeMs: 1000 }),
      review({ cardId: 3, rating: 3, responseTimeMs: 1000 }),
      review({ cardId: 4, rating: 2, responseTimeMs: 1000 }),
    ]);
    assert.deepEqual(
      worst.map((c) => c.cardId),
      [2, 4, 3]
    );
  });

  test("ranks a slow correct answer below a fast one of the same rating", () => {
    const worst = findWorstThreeCards([
      review({ cardId: 1, rating: 4, responseTimeMs: 1000 }),
      review({ cardId: 2, rating: 4, responseTimeMs: 90_000 }),
    ]);
    assert.equal(worst[0].cardId, 2);
  });

  test("returns everything when fewer than three cards were reviewed", () => {
    assert.equal(findWorstThreeCards([review()]).length, 1);
    assert.deepEqual(findWorstThreeCards([]), []);
  });
});

describe("isMatureCard", () => {
  test("requires stability strictly above 21 days AND at least 5 reps", () => {
    assert.equal(isMatureCard({ stability: 22, reps: 5 }), true);
    assert.equal(isMatureCard({ stability: 21, reps: 5 }), false);
    assert.equal(isMatureCard({ stability: 22, reps: 4 }), false);
  });

  test("treats a brand-new card as not mature", () => {
    const fresh = newCardDefaults();
    assert.equal(isMatureCard(fresh), false);
  });
});

describe("learning pool sizing", () => {
  test("a freshly seeded pool of 25 asks for no new words", () => {
    const seeded = Array(ACTIVE_LEARNING_TARGET).fill(newCardDefaults());
    assert.equal(countLearningCards(seeded), ACTIVE_LEARNING_TARGET);
    assert.equal(learningSlotsToFill(seeded), 0);
  });

  test("frees exactly one slot per word that matured", () => {
    const pool = [...Array(22).fill(learning), ...Array(3).fill(mature)];
    assert.equal(countLearningCards(pool), 22);
    assert.equal(learningSlotsToFill(pool), 3);
  });

  test("ignores matured words entirely, however large the deck has grown", () => {
    // The old 70%-of-everything rule stalled here; the pool is what matters.
    const pool = [...Array(200).fill(mature), ...Array(4).fill(learning)];
    assert.equal(learningSlotsToFill(pool), 21);
  });

  test("fills the whole pool when every word has matured", () => {
    assert.equal(
      learningSlotsToFill(Array(50).fill(mature)),
      ACTIVE_LEARNING_TARGET
    );
  });

  test("never asks for a negative number of words", () => {
    assert.equal(learningSlotsToFill(Array(30).fill(learning)), 0);
  });

  test("honours a custom target", () => {
    assert.equal(learningSlotsToFill(Array(4).fill(learning), 10), 6);
  });

  test("an empty deck asks for a full pool", () => {
    assert.equal(learningSlotsToFill([]), ACTIVE_LEARNING_TARGET);
  });
});

describe("dateToISO", () => {
  test("formats as YYYY-MM-DD", () => {
    assert.equal(dateToISO(new Date("2026-08-09T12:00:00Z")), "2026-08-09");
  });

  test("uses UTC, not local time", () => {
    // Documents current behaviour: late-evening local time in a negative
    // offset rolls over to the next UTC day.
    assert.equal(dateToISO(new Date("2026-08-09T23:30:00-05:00")), "2026-08-10");
  });
});
