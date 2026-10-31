import { fsrs, generatorParameters, Rating } from "ts-fsrs";
import { BEGINNER_VOCABULARY } from "../src/data/beginner-vocabulary";
import { dbCardToFSRS, fsrsCardToDbUpdate, newCardDefaults } from "../src/lib/fsrs";
import { getBeginnerProgress, getStudyCards } from "../src/lib/vocabulary-progress";
import type { SelectCard } from "../src/lib/db/schema";
import assert from "node:assert/strict";

// Same default FSRS parameters as the app, with random interval fuzz disabled for reproducibility.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));
const start = Date.UTC(2026, 10, 2, 17); // Monday, noon in Colombia.
const dayMs = 86_400_000;

function simulate(againRate: number, seed: number) {
  let randomState = seed;
  function random() {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 2 ** 32;
  }
  const cards: SelectCard[] = BEGINNER_VOCABULARY.filter((word) => word.level === "A1").map((word, index) => ({
    ...newCardDefaults(), id: index + 1, userId: "simulation", cefrLevel: "A1", deckId: "general",
    targetChunk: word.word, sentence: word.sentence, meaning: word.meaning, hint: word.hint,
    sourceContext: "A1 simulation", isActive: true, createdAt: new Date(start).toISOString(), due: new Date(start).toISOString(),
  }));
  let reviews = 0;
  let sessions = 0;
  let firstSeenDays: number | null = null;
  for (let day = 0; day < 730; day++) {
    if (day % 7 >= 5) continue;
    const now = new Date(start + day * dayMs);
    const selected = getStudyCards(cards, "beginner", "A1", now);
    assert.ok(selected.length <= 10, "a daily beginner session cannot exceed ten cards");
    if (selected.length) sessions++;
    for (const card of selected) {
      const rating = random() < againRate ? Rating.Again : Rating.Good;
      Object.assign(card, fsrsCardToDbUpdate(scheduler.repeat(dbCardToFSRS(card), now)[rating].card));
      reviews++;
    }
    const progress = getBeginnerProgress(cards).levels[0];
    if (progress.studied === 100 && firstSeenDays === null) firstSeenDays = day + 1;
    if (progress.complete) {
      assert.ok(progress.studied === 100 && progress.mature >= 80 && reviews >= 420);
      assert.ok(reviews <= sessions * 10);
      return { calendarDays: day + 1, weeks: Number(((day + 1) / 7).toFixed(1)), sessions, reviews, firstSeenDays };
    }
  }
  return null;
}

for (const againRate of [0, 0.05, 0.1, 0.2]) {
  const results = Array.from({ length: 20 }, (_, index) => simulate(againRate, index + 1));
  const completed = results.filter((result) => result !== null).sort((a, b) => a.calendarDays - b.calendarDays);
  const median = completed[Math.floor(completed.length / 2)];
  console.log(JSON.stringify({ againPercent: againRate * 100, runsCompleted: completed.length, runs: results.length,
    minWeeks: completed[0]?.weeks, medianWeeks: median?.weeks, maxWeeks: completed.at(-1)?.weeks, median }));
}
