import test from "node:test";
import assert from "node:assert/strict";
import { readProgress, recordAnswer, summarizeProgress } from "../progress.js";

function useMemoryStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test("answers are tracked by stable vocabulary ID and persist", () => {
  useMemoryStorage();
  const progress = {};
  recordAnswer(progress, "n5-l01-001", true);
  recordAnswer(progress, "n5-l01-001", false);
  assert.equal(progress["n5-l01-001"].attempts, 2);
  assert.equal(progress["n5-l01-001"].correct, 1);
  assert.equal(progress["n5-l01-001"].wrong, 1);
  assert.deepEqual(readProgress(), progress);
});

test("summary counts learned, wrong, due, and accuracy for supplied words", () => {
  const now = new Date().toISOString();
  const progress = {
    "n5-l01-001": { attempts: 3, correct: 3, wrong: 0, mastery: 80, status: "mastered", nextReview: now },
    "n5-l01-002": { attempts: 2, correct: 1, wrong: 1, mastery: 20, status: "learning", nextReview: now }
  };
  const words = [{ id: "n5-l01-001" }, { id: "n5-l01-002" }, { id: "n5-l01-003" }];
  assert.deepEqual(summarizeProgress(progress, words), {
    learned: 1, wrong: 1, due: 2, attempts: 5, accuracy: 80, total: 3
  });
});
