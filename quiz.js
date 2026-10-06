const OPTION_COUNT = 4;

export function createQuiz(words, { mode = "jp-bn", count = "all", distractorPool = words } = {}) {
  if (!Array.isArray(words)) throw new TypeError("Quiz vocabulary must be an array.");
  const eligible = words.filter((word) =>
    typeof word.id === "string" &&
    typeof word.japanese === "string" && word.japanese &&
    typeof word.bangla === "string" && word.bangla
  );
  const candidates = mode === "context"
    ? eligible.filter((word) => typeof word.example?.japanese === "string" && word.example.japanese)
    : eligible;
  const shuffled = shuffle(candidates);
  const limit = count === "all" ? shuffled.length : Math.max(1, Number(count) || 10);
  const distractors = distractorPool.filter((word) =>
    typeof word.japanese === "string" && word.japanese &&
    typeof word.bangla === "string" && word.bangla
  );
  return shuffled.slice(0, limit).map((word) => makeQuestion(word, distractors, mode));
}

function makeQuestion(word, pool, mode) {
  const actualMode = mode === "random" ? (Math.random() < 0.5 ? "jp-bn" : "bn-jp") : mode;
  const isJapanesePrompt = actualMode === "jp-bn" || actualMode === "context";
  const answer = isJapanesePrompt ? word.bangla : word.japanese;
  const distractors = [];
  for (const candidate of shuffle(pool)) {
    if (candidate.id === word.id) continue;
    const value = isJapanesePrompt ? candidate.bangla : candidate.japanese;
    if (value !== answer && !distractors.includes(value)) distractors.push(value);
    if (distractors.length === OPTION_COUNT - 1) break;
  }
  const choices = shuffle([answer, ...distractors]);
  const prompt = actualMode === "context" && word.example?.japanese
    ? word.example.japanese
    : isJapanesePrompt ? word.japanese : word.bangla;
  const subprompt = actualMode === "context"
    ? `What does ${word.japanese} mean in this sentence?`
    : isJapanesePrompt ? word.romaji : "";
  return { word, mode: actualMode, prompt, subprompt, answer, choices };
}

export function gradeQuestion(question, choice) {
  if (!question || !Array.isArray(question.choices) || !question.choices.includes(choice)) {
    throw new Error("The selected answer is not one of this question's choices.");
  }
  return { correct: choice === question.answer, answer: question.answer };
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
