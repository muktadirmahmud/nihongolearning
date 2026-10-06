import test from "node:test";
import assert from "node:assert/strict";
import { createQuiz, gradeQuestion } from "../quiz.js";

const words = [
  { id: "n5-l01-001", japanese: "みず", romaji: "mizu", bangla: "পানি", example: { japanese: "みずを のみます。", romaji: "Mizu o nomimasu.", bangla: "পানি পান করি।" } },
  { id: "n5-l01-002", japanese: "たべます", romaji: "tabemasu", bangla: "খাওয়া" },
  { id: "n5-l01-003", japanese: "いきます", romaji: "ikimasu", bangla: "যাওয়া" },
  { id: "n5-l01-004", japanese: "みます", romaji: "mimasu", bangla: "দেখা" }
];

test("Japanese-to-Bangla questions have one matching correct answer", () => {
  const [question] = createQuiz(words, { mode: "jp-bn", count: 1 });
  assert.equal(question.prompt, question.word.japanese);
  assert.equal(question.choices.filter((choice) => choice === question.answer).length, 1);
  assert.equal(gradeQuestion(question, question.answer).correct, true);
  assert.equal(gradeQuestion(question, question.choices.find((choice) => choice !== question.answer)).correct, false);
});

test("Bangla-to-Japanese reverses the prompt and answer", () => {
  const [question] = createQuiz(words, { mode: "bn-jp", count: 1 });
  assert.equal(question.prompt, question.word.bangla);
  assert.equal(question.answer, question.word.japanese);
});

test("context mode displays an example and the target word in its cue", () => {
  const [question] = createQuiz(words, { mode: "context", count: 1 });
  assert.equal(question.prompt, question.word.example.japanese);
  assert.match(question.subprompt, new RegExp(question.word.japanese));
  assert.equal(question.answer, question.word.bangla);
});

test("quiz count is capped by the available pool and choices do not repeat", () => {
  const questions = createQuiz(words, { mode: "random", count: 20 });
  assert.equal(questions.length, words.length);
  for (const question of questions) {
    assert.equal(new Set(question.choices).size, question.choices.length);
    assert.ok(question.choices.includes(question.answer));
  }
});

test("a single retry target can use distractors from the selected lesson pool", () => {
  const [question] = createQuiz([words[0]], { mode: "jp-bn", distractorPool: words });
  assert.equal(question.choices.length, 4);
  assert.equal(question.choices.filter((choice) => choice === question.answer).length, 1);
});
