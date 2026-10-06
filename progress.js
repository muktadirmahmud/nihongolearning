const STORAGE_KEY = "kotoba-progress-v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export function readProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Saved progress has an invalid format.");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Could not read saved study progress: ${error.message}`, { cause: error });
  }
}

export function recordAnswer(progress, wordId, isCorrect) {
  const previous = progress[wordId] ?? {
    attempts: 0, correct: 0, wrong: 0, mastery: 0,
    lastReviewed: null, nextReview: null, streak: 0, status: "new"
  };
  const now = new Date();
  const streak = isCorrect ? previous.streak + 1 : 0;
  const mastery = Math.max(0, Math.min(100, previous.mastery + (isCorrect ? 20 : -15)));
  const intervalDays = isCorrect ? Math.min(30, 2 ** Math.max(0, streak - 1)) : 0;
  progress[wordId] = {
    attempts: previous.attempts + 1,
    correct: previous.correct + Number(isCorrect),
    wrong: previous.wrong + Number(!isCorrect),
    mastery,
    lastReviewed: now.toISOString(),
    nextReview: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
    streak,
    status: mastery >= 80 ? "mastered" : "learning"
  };
  persistProgress(progress);
}

export function persistProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    throw new Error(`Could not save study progress: ${error.message}`, { cause: error });
  }
}

export function summarizeProgress(progress, words) {
  const entries = words.map((word) => progress[word.id]).filter(Boolean);
  const now = Date.now();
  const learned = entries.filter((entry) => entry.status === "mastered").length;
  const wrong = words.filter((word) => (progress[word.id]?.wrong ?? 0) > 0).length;
  const due = words.filter((word) => {
    const date = progress[word.id]?.nextReview;
    return date && Date.parse(date) <= now;
  }).length;
  const attempts = entries.reduce((total, entry) => total + entry.attempts, 0);
  const correct = entries.reduce((total, entry) => total + entry.correct, 0);
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  return { learned, wrong, due, attempts, accuracy, total: words.length };
}
