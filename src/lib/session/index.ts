import type { ReviewResult, ScoredCard } from "@/types";

export const MIN_WORDS_PER_CATEGORY = 5;
export const DAILY_NEW_CARD_LIMIT = 5;
export const MAX_CARDS_PER_CATEGORY = 5;

export function selectSessionCards<
  T extends { deckId?: string | null; state: number; due: string }
>(allDueCards: T[], maxPerCategory: number = MAX_CARDS_PER_CATEGORY): T[] {
  const byDeck = new Map<string, { reviews: T[]; news: T[] }>();

  for (const card of allDueCards) {
    const deck = card.deckId || "general";
    let group = byDeck.get(deck);
    if (!group) {
      group = { reviews: [], news: [] };
      byDeck.set(deck, group);
    }
    if (card.state === 0) {
      group.news.push(card);
    } else {
      group.reviews.push(card);
    }
  }

  const selectedCards: T[] = [];

  for (const [, { reviews, news }] of byDeck) {
    const sortedReviews = [...reviews].sort(
      (a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()
    );
    const chosenReviews = sortedReviews.slice(0, maxPerCategory);
    selectedCards.push(...chosenReviews);

    const remainingSlots = maxPerCategory - chosenReviews.length;
    if (remainingSlots > 0) {
      const chosenNews = news.slice(0, remainingSlots);
      selectedCards.push(...chosenNews);
    }
  }

  return selectedCards;
}

export function computePerformanceScore(
  rating: number,
  responseTimeSeconds: number
): number {
  const base = ((rating - 1) / 3) * 100;
  const timePenalty = Math.min(Math.max(responseTimeSeconds - 30, 0), 60) * 0.5;
  return base - timePenalty;
}

export function findWorstThreeCards(reviews: ReviewResult[]): ScoredCard[] {
  const scored: ScoredCard[] = reviews.map((r) => ({
    cardId: r.cardId,
    targetChunk: r.targetChunk || r.word || "",
    word: r.targetChunk || r.word || "",
    sentence: r.sentence,
    rating: r.rating,
    responseTimeSeconds: r.responseTimeMs / 1000,
    score: computePerformanceScore(r.rating, r.responseTimeMs / 1000),
  }));
  return scored.sort((a, b) => a.score - b.score).slice(0, 3);
}

export function isMatureCard(card: { stability: number; reps: number }): boolean {
  return card.stability > 21 && card.reps >= 5;
}

export function getMissingCardsForCategory(
  dueCount: number,
  targetCount: number = MIN_WORDS_PER_CATEGORY
): number {
  return Math.max(0, targetCount - dueCount);
}

export function shouldExpandDeck(
  activeCards: Array<{ stability: number; reps: number }>,
  todayNewCount: number,
  hasDueCards: boolean,
  dailyNewCardLimit: number = DAILY_NEW_CARD_LIMIT
): boolean {
  if (activeCards.length === 0) return false;
  if (todayNewCount >= dailyNewCardLimit) return false;
  // Nothing to study today: pull in a new card instead of leaving the deck empty.
  if (!hasDueCards) return true;
  const matureCount = activeCards.filter(
    (c) => c.stability > 21 && c.reps >= 5
  ).length;
  return matureCount / activeCards.length > 0.7;
}

export function dateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
