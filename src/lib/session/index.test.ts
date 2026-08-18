import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computePerformanceScore,
  findWorstThreeCards,
  isMatureCard,
  getMissingCardsForCategory,
  dateToISO,
  MIN_WORDS_PER_CATEGORY,
} from "./index";
import { newCardDefaults } from "@/lib/fsrs";
import type { ReviewResult } from "@/types";

function review(overrides: Partial<ReviewResult> = {}): ReviewResult {
  return {
    cardId: 1,
    targetChunk: "however",
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

describe("getMissingCardsForCategory", () => {
  test("returns 5 when 0 cards are due in category", () => {
    assert.equal(getMissingCardsForCategory(0), MIN_WORDS_PER_CATEGORY);
  });

  test("returns 2 when 3 cards are due in category", () => {
    assert.equal(getMissingCardsForCategory(3), 2);
  });

  test("returns 0 when 5 cards are due in category", () => {
    assert.equal(getMissingCardsForCategory(5), 0);
  });

  test("returns 0 when more than 5 cards are due in category", () => {
    assert.equal(getMissingCardsForCategory(7), 0);
  });
});

describe("dateToISO", () => {
  test("formats as YYYY-MM-DD", () => {
    assert.equal(dateToISO(new Date("2026-08-09T12:00:00Z")), "2026-08-09");
  });
});
