import assert from "node:assert/strict";
import { test } from "node:test";
import { BEGINNER_VOCABULARY } from "./beginner-vocabulary";

test("each beginner level has enough material to practice progressively", () => {
  for (const level of ["A1", "A2", "B1"]) {
    assert.ok(
      BEGINNER_VOCABULARY.filter((item) => item.level === level).length >= 100,
      `${level} needs at least 100 words`,
    );
  }
  const ranks = { A1: 0, A2: 1, B1: 2 };
  for (let index = 1; index < BEGINNER_VOCABULARY.length; index++) {
    assert.ok(ranks[BEGINNER_VOCABULARY[index - 1].level] <= ranks[BEGINNER_VOCABULARY[index].level]);
  }
});

test("every vocabulary item has a unique word and complete learning support", () => {
  const seen = new Set<string>();
  for (const item of BEGINNER_VOCABULARY) {
    for (const field of ["word", "level", "topic", "sentence", "meaning", "hint"] as const) {
      assert.ok(item[field].trim(), `${item.word}: missing ${field}`);
    }
    assert.ok(["A1", "A2", "B1"].includes(item.level), `${item.word}: invalid level`);
    assert.equal(item.word, item.word.trim());
    const normalized = item.word.toLowerCase();
    assert.ok(!seen.has(normalized), `Repeated word: ${item.word}`);
    seen.add(normalized);
  }
});

test("cloze sentences contain the exact answer once and stay accessible", () => {
  for (const item of BEGINNER_VOCABULARY) {
    const clozes = [...item.sentence.matchAll(/\{\{([^{}]+)\}\}/g)];
    assert.equal(clozes.length, 1, `${item.word}: expected one cloze`);
    assert.equal(clozes[0][1], item.word, `${item.word}: cloze must match the answer`);
    const completed = item.sentence.replace(`{{${item.word}}}`, item.word);
    assert.ok(!/[{}]/.test(completed), `${item.word}: malformed cloze`);
    const words = completed.toLowerCase().match(/[\p{L}]+(?:['’-][\p{L}]+)*/gu) ?? [];
    const answer = item.word.toLowerCase().split(/\s+/);
    assert.ok(words.some((_, index) => answer.every((word, offset) => words[index + offset] === word)), `${item.word}: answer absent from sentence`);
    const limit = item.level === "A1" ? 18 : 28;
    assert.ok(words.length <= limit, `${item.word}: ${words.length} words exceeds ${limit}`);
  }
});
