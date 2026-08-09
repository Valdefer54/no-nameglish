import type { ReviewResult, ScoredCard } from "@/types";

export const DAILY_NEW_CARD_LIMIT = 5;
export const ACTIVE_LEARNING_TARGET = 5;

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

export function isMatureCard(card: { stability: number; reps: number }): boolean {
  return card.stability > 21 && card.reps >= 5;
}

export function shouldExpandDeck(
  activeCards: Array<{ stability: number; reps: number }>,
  todayNewCount: number,
  dailyNewCardLimit: number = DAILY_NEW_CARD_LIMIT,
  activeLearningTarget: number = ACTIVE_LEARNING_TARGET
): boolean {
  if (todayNewCount >= dailyNewCardLimit) return false;
  const learningCount = activeCards.filter((c) => !isMatureCard(c)).length;
  return learningCount < activeLearningTarget;
}

export function dateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
