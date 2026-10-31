import { BEGINNER_VOCABULARY, type BeginnerLevel } from "@/data/beginner-vocabulary";
import { getSessionCardLimit, isMatureCard, selectSessionCards } from "@/lib/session";

export const BEGINNER_LEVELS = ["A1", "A2", "B1"] as const;
export const MATURITY_TARGET = 0.8;

export interface DailyReviewBudget {
  counts: Record<string, number>;
  reviewedIds: Set<number>;
}

interface VocabularyCard {
  id: number;
  targetChunk: string;
  cefrLevel?: string | null;
  deckId?: string | null;
  state: number;
  reps: number;
  stability: number;
  due: string;
  isActive: boolean;
}

const wordKey = (level: string, word: string) => `${level}:${word}`;
const wordOrder = new Map(BEGINNER_VOCABULARY.map((word, index) => [wordKey(word.level, word.word), index]));

export function getBeginnerProgress(cards: VocabularyCard[]) {
  const studied = new Set<string>();
  const mature = new Set<string>();
  for (const card of cards) {
    if (!card.isActive || !card.cefrLevel) continue;
    const key = wordKey(card.cefrLevel, card.targetChunk);
    if (card.reps > 0) studied.add(key);
    if (isMatureCard(card)) mature.add(key);
  }
  const levels = BEGINNER_LEVELS.map((level) => {
    const words = BEGINNER_VOCABULARY.filter((word) => word.level === level);
    const studiedCount = words.filter((word) => studied.has(wordKey(level, word.word))).length;
    const matureCount = words.filter((word) => mature.has(wordKey(level, word.word))).length;
    return { level, total: words.length, studied: studiedCount, mature: matureCount,
      complete: studiedCount === words.length && matureCount >= Math.ceil(words.length * MATURITY_TARGET) };
  });
  const total = levels.reduce((sum, level) => sum + level.total, 0);
  const studiedCount = levels.reduce((sum, level) => sum + level.studied, 0);
  const matureCount = levels.reduce((sum, level) => sum + level.mature, 0);
  return { levels, total, studied: studiedCount, mature: matureCount,
    complete: studiedCount === total && matureCount >= Math.ceil(total * MATURITY_TARGET) };
}

export function getNextStudyLevel(current: BeginnerLevel, cards: VocabularyCard[]): BeginnerLevel | "B2-C1" {
  const progress = getBeginnerProgress(cards);
  for (const level of progress.levels.slice(BEGINNER_LEVELS.indexOf(current))) {
    if (!level.complete) return level.level;
  }
  return progress.complete ? "B2-C1" : "B1";
}

export function isVocabularyCardUnlocked(card: Pick<VocabularyCard, "cefrLevel">, studyLevel: "beginner" | "advanced", current: BeginnerLevel) {
  if (studyLevel === "advanced" || card.cefrLevel == null) return true;
  const index = BEGINNER_LEVELS.indexOf(card.cefrLevel as BeginnerLevel);
  return index >= 0 && index <= BEGINNER_LEVELS.indexOf(current);
}

export function getStudyCards<T extends VocabularyCard>(cards: T[], studyLevel: "beginner" | "advanced", current: BeginnerLevel, now = new Date(), budget?: DailyReviewBudget): T[] {
  const due = cards.filter((card) => card.isActive && !budget?.reviewedIds.has(card.id) && new Date(card.due) <= now && isVocabularyCardUnlocked(card, studyLevel, current));
  due.sort((a, b) => {
    if (a.state !== 0 && b.state === 0) return -1;
    if (a.state === 0 && b.state !== 0) return 1;
    if (a.state !== 0) return new Date(a.due).getTime() - new Date(b.due).getTime() || a.id - b.id;
    if (studyLevel === "beginner") {
      const order = (wordOrder.get(wordKey(a.cefrLevel ?? "", a.targetChunk)) ?? Infinity)
        - (wordOrder.get(wordKey(b.cefrLevel ?? "", b.targetChunk)) ?? Infinity);
      if (order) return order;
    }
    return a.id - b.id;
  });
  const selected = selectSessionCards(due, getSessionCardLimit(studyLevel));
  const counts = { ...budget?.counts };
  const limited = selected.filter((card) => {
    const category = card.deckId || "general";
    const used = counts[category] ?? 0;
    if (used >= getSessionCardLimit(studyLevel)) return false;
    counts[category] = used + 1;
    return true;
  });
  return studyLevel === "beginner" ? limited.slice(0, 10) : limited;
}
