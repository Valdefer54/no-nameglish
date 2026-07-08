import type { ReviewResult, ScoredCard } from "@/types";

export const DAILY_NEW_CARD_LIMIT = 5;

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
    word: r.word,
    rating: r.rating,
    responseTimeSeconds: r.responseTimeMs / 1000,
    score: computePerformanceScore(r.rating, r.responseTimeMs / 1000),
  }));
  return scored.sort((a, b) => a.score - b.score).slice(0, 3);
}

export function shouldExpandDeck(
  activeCards: Array<{ stability: number; reps: number }>,
  todayNewCount: number,
  dailyNewCardLimit: number = DAILY_NEW_CARD_LIMIT
): boolean {
  if (activeCards.length === 0) return false;
  if (todayNewCount >= dailyNewCardLimit) return false;
  const matureCount = activeCards.filter(
    (c) => c.stability > 21 && c.reps >= 5
  ).length;
  return matureCount / activeCards.length > 0.7;
}

export function dateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
