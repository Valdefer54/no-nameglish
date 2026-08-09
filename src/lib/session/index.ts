import type { ReviewResult, ScoredCard } from "@/types";

export const DAILY_NEW_CARD_LIMIT = 5;

// How many words may be "in learning" at once, across every category combined.
export const ACTIVE_LEARNING_TARGET = 25;

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

export function countLearningCards(
  activeCards: Array<{ stability: number; reps: number }>
): number {
  return activeCards.filter((c) => !isMatureCard(c)).length;
}

// How many brand-new words to activate to bring the learning pool back up to
// target. A word leaves the pool only by maturing, so this is normally a
// trickle of one or two rather than a batch.
export function learningSlotsToFill(
  activeCards: Array<{ stability: number; reps: number }>,
  activeLearningTarget: number = ACTIVE_LEARNING_TARGET
): number {
  return Math.max(activeLearningTarget - countLearningCards(activeCards), 0);
}

export function dateToISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
