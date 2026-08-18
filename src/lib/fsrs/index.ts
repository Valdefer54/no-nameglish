import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FSRSCard,
} from "ts-fsrs";
import type { SelectCard } from "@/lib/db/schema";

const params = generatorParameters({ enable_fuzz: true });
const f = fsrs(params);

export function dbCardToFSRS(dbCard: SelectCard): FSRSCard {
  return {
    due: new Date(dbCard.due),
    stability: dbCard.stability,
    difficulty: dbCard.difficulty,
    elapsed_days: dbCard.elapsedDays,
    scheduled_days: dbCard.scheduledDays,
    reps: dbCard.reps,
    lapses: dbCard.lapses,
    learning_steps: dbCard.learningSteps,
    state: dbCard.state as State,
    last_review: dbCard.lastReview ? new Date(dbCard.lastReview) : undefined,
  };
}

export function fsrsCardToDbUpdate(fsrsCard: FSRSCard) {
  return {
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    learningSteps: fsrsCard.learning_steps,
    state: fsrsCard.state as number,
    lastReview: fsrsCard.last_review?.toISOString() ?? null,
    due: fsrsCard.due.toISOString(),
  };
}

export function scheduleCard(
  dbCard: SelectCard,
  rating: Rating,
  now: Date = new Date()
) {
  const fsrsCard = dbCardToFSRS(dbCard);
  const recordLog = f.repeat(fsrsCard, now);
  // Rating.Manual (0) is excluded from IPreview; our callers only pass 1-4
  type ValidRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy;
  return fsrsCardToDbUpdate(recordLog[rating as ValidRating].card);
}

export function newCardDefaults() {
  const empty = createEmptyCard();
  return {
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    learningSteps: empty.learning_steps,
    state: empty.state as number,
    lastReview: null,
    due: new Date().toISOString(),
  };
}

export function isMature(stability: number, reps: number): boolean {
  return stability > 21 && reps >= 5;
}

export { Rating, State };
