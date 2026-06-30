export type VocabCategory =
  | "debate-connectors"
  | "precision-verbs"
  | "intensity-modifiers"
  | "phrasal-verbs"
  | "general";

export type WordSource = "seed" | "expansion";

// ts-fsrs State: New=0, Learning=1, Review=2, Relearning=3
export type CardState = 0 | 1 | 2 | 3;

// ts-fsrs Rating: Again=1, Hard=2, Good=3, Easy=4
export type Rating = 1 | 2 | 3 | 4;

export const CATEGORIES: VocabCategory[] = [
  "debate-connectors",
  "precision-verbs",
  "intensity-modifiers",
  "phrasal-verbs",
  "general",
];

export const CATEGORY_LABELS: Record<VocabCategory, string> = {
  "debate-connectors": "Debate Connectors",
  "precision-verbs": "Precision Verbs",
  "intensity-modifiers": "Intensity Modifiers",
  "phrasal-verbs": "Phrasal Verbs",
  general: "General Vocabulary",
};

export const CATEGORY_COLORS: Record<VocabCategory, string> = {
  "debate-connectors": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "precision-verbs": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "intensity-modifiers": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "phrasal-verbs": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  general: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
};

export interface VocabularyWord {
  id: number;
  word: string;
  definition: string;
  exampleSentence: string;
  translationHint: string | null;
  category: VocabCategory;
  addedAt: string;
  source: WordSource;
}

export interface Card {
  id: number;
  wordId: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: string | null;
  nextReview: string;
  category: VocabCategory;
  isActive: boolean;
  createdAt: string;
}

export interface CardWithWord {
  card: Card;
  word: VocabularyWord;
}

export interface Session {
  id: number;
  startedAt: string;
  completedAt: string | null;
  totalCards: number;
  worstCardIds: string | null;
}

export interface CardReview {
  id: number;
  sessionId: number;
  cardId: number;
  rating: Rating;
  responseTimeMs: number;
  sentence: string;
  reviewedAt: string;
}

export interface DeckStats {
  category: VocabCategory;
  totalActive: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  matureCount: number;
  dueCount: number;
}

export interface ReviewResult {
  cardId: number;
  word: string;
  rating: Rating;
  responseTimeMs: number;
  sentence: string;
}

export interface ScoredCard {
  cardId: number;
  word: string;
  score: number;
  rating: Rating;
  responseTimeSeconds: number;
}
