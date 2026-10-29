import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computePerformanceScore,
  findWorstThreeCards,
  isMatureCard,
  getMissingCardsForCategory,
  dateToISO,
  MIN_WORDS_PER_CATEGORY,
  MAX_CARDS_PER_CATEGORY,
  getSessionCardLimit,
  selectSessionCards,
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

describe("selectSessionCards", () => {
  test("selects at most 5 new cards when there are no review cards", () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      deckId: "general",
      state: 0,
      due: "2026-09-02T10:00:00Z",
    }));

    const selected = selectSessionCards(cards);
    assert.equal(selected.length, MAX_CARDS_PER_CATEGORY);
    assert.ok(selected.every((c) => c.state === 0));
  });

  test("prioritizes review cards and fills remaining slots with new cards up to 5", () => {
    const reviews = [
      { id: 101, deckId: "general", state: 2, due: "2026-09-01T10:00:00Z" },
      { id: 102, deckId: "general", state: 1, due: "2026-09-02T08:00:00Z" },
    ];
    const news = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      deckId: "general",
      state: 0,
      due: "2026-09-02T10:00:00Z",
    }));

    const selected = selectSessionCards([...reviews, ...news]);
    assert.equal(selected.length, 5);
    const selectedReviews = selected.filter((c) => c.state !== 0);
    const selectedNews = selected.filter((c) => c.state === 0);
    assert.equal(selectedReviews.length, 2);
    assert.equal(selectedNews.length, 3);
  });

  test("caps review cards at 5 and adds 0 new cards when review cards >= 5", () => {
    const reviews = Array.from({ length: 8 }, (_, i) => ({
      id: 100 + i,
      deckId: "general",
      state: 2,
      due: `2026-09-01T${String(i).padStart(2, "0")}:00:00Z`,
    }));
    const news = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      deckId: "general",
      state: 0,
      due: "2026-09-02T10:00:00Z",
    }));

    const selected = selectSessionCards([...reviews, ...news]);
    assert.equal(selected.length, 5);
    assert.ok(selected.every((c) => c.state !== 0));
    // Most overdue reviews should be chosen first
    assert.equal(selected[0].id, 100);
    assert.equal(selected[4].id, 104);
  });

  test("guarantees at most 25 cards across 5 categories", () => {
    const categories = [
      "debate-connectors",
      "precision-verbs",
      "intensity-modifiers",
      "phrasal-verbs",
      "general",
    ];

    const allCards: Array<{ id: number; deckId: string; state: number; due: string }> = [];
    let id = 1;

    for (const cat of categories) {
      // 4 reviews and 6 new cards in each category (total 10 per category)
      for (let i = 0; i < 4; i++) {
        allCards.push({ id: id++, deckId: cat, state: 2, due: "2026-09-01T10:00:00Z" });
      }
      for (let i = 0; i < 6; i++) {
        allCards.push({ id: id++, deckId: cat, state: 0, due: "2026-09-02T10:00:00Z" });
      }
    }

    assert.equal(allCards.length, 50); // 50 total candidates
    const selected = selectSessionCards(allCards);
    assert.equal(selected.length, 25); // Exactly 25 selected (5 per category)

    for (const cat of categories) {
      const catCards = selected.filter((c) => c.deckId === cat);
      assert.equal(catCards.length, 5);
      assert.equal(catCards.filter((c) => c.state !== 0).length, 4);
      assert.equal(catCards.filter((c) => c.state === 0).length, 1);
    }
  });
});

 test("beginner sessions select ten cards while advanced keeps five per category", () => {
  const candidates = Array.from({ length: 15 }, (_, id) => ({ id, deckId: "general", state: 0, due: "2026-01-01" }));
  assert.equal(selectSessionCards(candidates, getSessionCardLimit("beginner")).length, 10);
  assert.equal(selectSessionCards(candidates, getSessionCardLimit("advanced")).length, 5);
});
