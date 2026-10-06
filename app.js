import { getLessonRegistry, loadLesson, loadLessons } from "./data-loader.js";
import { createQuiz, gradeQuestion } from "./quiz.js";
import { readProgress, recordAnswer, summarizeProgress } from "./progress.js";

const main = document.querySelector("#main-content");
const registry = getLessonRegistry();
const state = {
  route: "home",
  progress: {},
  words: [],
  selectedLesson: null,
  selectedLessons: new Set(["n5-1"]),
  quiz: null,
  toastTimer: null
};

try {
  state.progress = readProgress();
} catch (error) {
  reportError(error);
}
initializeTheme();
render();
loadLessons(registry).then((words) => {
  state.words = words;
  render();
}).catch(showError);
updateConnectionStatus();
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => navigate(button.dataset.route));
});
document.querySelector("#theme-toggle").addEventListener("click", toggleTheme);
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Offline support could not be registered.", error);
    });
  });
}

function navigate(route) {
  state.route = route;
  state.quiz = null;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === state.route);
  });
  const renderer = {
    home: renderHome,
    learn: renderLessons,
    lesson: renderLesson,
    quiz: renderQuizSetup,
    "quiz-run": renderQuizQuestion,
    "quiz-results": renderQuizResults,
    review: renderReview,
    progress: renderProgress,
    grammar: renderGrammar
  }[state.route] ?? renderHome;
  renderer();
}

function renderHome() {
  const stats = summarizeProgress(state.progress, state.words);
  main.innerHTML = `
    <section class="hero">
      <p class="eyebrow">A little Japanese, every day</p>
      <h1>Your study space, at your pace.</h1>
      <p>Learn one word at a time with a calm, kana-first workspace made for your N5 and N4 journey.</p>
      <button class="button" data-action="open-lessons" type="button">Explore lessons <span aria-hidden="true">→</span></button>
    </section>
    <section class="section" aria-labelledby="stats-title">
      <div class="section-heading"><h2 id="stats-title">Your learning</h2><button class="text-button" data-action="progress">Details →</button></div>
      <div class="stats-grid">
        ${statCard(stats.learned, "Words mastered")}
        ${statCard(stats.due, "Due to review")}
        ${statCard(stats.wrong, "Words to practise")}
        ${statCard(`${stats.accuracy}%`, "Quiz accuracy")}
      </div>
    </section>
    <section class="section">
      <div class="section-heading"><h2>Study by level</h2></div>
      <div class="curriculum-grid">
        <button class="level-card" data-action="level" data-level="n5" type="button"><span><h3>N5 · Beginner</h3><p>Lessons 01–25</p></span><span class="level-tag">Start</span></button>
        <button class="level-card" data-action="level" data-level="n4" type="button"><span><h3>N4 · Elementary</h3><p>Lessons 26–50</p></span><span class="level-tag">Explore</span></button>
        <div class="level-card is-disabled"><span><h3>N3</h3><p>Ready to add when you are</p></span><span class="level-tag">Future</span></div>
      </div>
    </section>
    <section class="section">
      <div class="section-heading"><h2>Keep your routine</h2></div>
      <div class="button-row"><button class="button" data-action="quiz" type="button">Set up a quiz</button><button class="button button-secondary" data-action="review" type="button">Review mistakes</button><button class="button button-secondary" data-action="grammar" type="button">Grammar library</button></div>
    </section>
    ${!state.words.length ? dataNotice() : ""}
  `;
  bindActions();
}

function renderLessons() {
  const activeLevel = state.selectedLesson?.level ?? "n5";
  const lessons = registry.filter((lesson) => lesson.level === activeLevel);
  main.innerHTML = `
    ${pageHeading("Lessons", "Choose a lesson to study its vocabulary. Lessons with no entries yet remain ready for your own vocabulary.")}
    <div class="button-row" role="group" aria-label="Choose level">
      <button class="button ${activeLevel === "n5" ? "" : "button-secondary"}" data-action="level" data-level="n5" type="button">N5 · Lessons 01–25</button>
      <button class="button ${activeLevel === "n4" ? "" : "button-secondary"}" data-action="level" data-level="n4" type="button">N4 · Lessons 26–50</button>
    </div>
    <section class="section lesson-list" aria-label="${activeLevel.toUpperCase()} lessons">
      ${lessons.map((lesson) => `
        <button class="lesson-row" data-action="lesson" data-level="${lesson.level}" data-number="${lesson.number}" type="button">
          <span><strong>${escapeHtml(lesson.title)}</strong><span>Vocabulary file ready</span></span>
          <span aria-hidden="true">→</span>
        </button>`).join("")}
    </section>`;
  bindActions();
}

async function renderLesson() {
  const lesson = state.selectedLesson;
  if (!lesson) return navigate("learn");
  main.innerHTML = `<div class="empty-state"><p>Loading lesson vocabulary…</p></div>`;
  try {
    const words = await loadLesson(lesson.level, lesson.number);
    state.words = words;
    const title = `Lesson ${String(lesson.number).padStart(2, "0")}`;
    main.innerHTML = `
      ${pageHeading(`${lesson.level.toUpperCase()} · ${title}`, `${words.length} vocabulary ${words.length === 1 ? "word" : "words"}`)}
      <div class="button-row">
        <button class="button button-secondary" data-action="adjacent-lesson" data-direction="-1" type="button" ${lesson.number <= (lesson.level === "n5" ? 1 : 26) ? "disabled" : ""}>← Previous</button>
        <button class="button button-secondary" data-action="adjacent-lesson" data-direction="1" type="button" ${lesson.number >= (lesson.level === "n5" ? 25 : 50) ? "disabled" : ""}>Next →</button>
        <button class="button" data-action="quiz-current-lesson" type="button" ${words.length < 2 ? "disabled" : ""}>Quiz this lesson</button>
      </div>
      <section class="section word-list">${words.length ? words.map(renderWord).join("") : emptyLesson(title)}</section>
    `;
    bindActions();
  } catch (error) {
    showError(error);
  }
}

function renderWord(word) {
  return `<article class="word-card">
    <div class="word-head"><div><h2 class="word-japanese" lang="ja">${escapeHtml(word.japanese)}</h2><p class="word-romaji">${escapeHtml(word.romaji)}</p><p class="word-meaning" lang="bn">${escapeHtml(word.bangla)}</p></div>
    ${word.kanji ? `<span class="word-kanji" lang="ja">Kanji · ${escapeHtml(word.kanji)}</span>` : ""}
    </div>
    ${word.example ? `<div class="example"><p class="example-japanese" lang="ja">${escapeHtml(word.example.japanese)}</p><p class="example-romaji">${escapeHtml(word.example.romaji)}</p><p class="example-bangla" lang="bn">${escapeHtml(word.example.bangla)}</p></div>` : ""}
  </article>`;
}

function renderQuizSetup() {
  const selected = selectedLessonEntries();
  const selectedWordsPromise = loadLessons(selected);
  main.innerHTML = `
    ${pageHeading("Quiz setup", "Pick lessons and a question style. Your study history is saved on this device.")}
    <section class="panel setup-grid">
      <div><label class="field-label" for="quiz-mode">Quiz mode</label><select class="select-input" id="quiz-mode">
        <option value="jp-bn">Japanese → Bangla</option><option value="bn-jp">Bangla → Japanese</option>
        <option value="context">Example sentence → Bangla</option><option value="random">Random direction</option>
      </select></div>
      <div><label class="field-label" for="quiz-count">Number of questions</label><select class="select-input" id="quiz-count">
        <option value="10">10 questions</option><option value="20">20 questions</option><option value="all">All available words</option>
      </select></div>
    </section>
    <section class="section">
      <div class="section-heading"><h2>Select lessons</h2><div class="button-row"><button class="button button-quiet" data-action="select-all" type="button">Select all</button><button class="button button-quiet" data-action="clear-all" type="button">Clear all</button></div></div>
      ${["n5", "n4"].map((level) => `
        <div class="panel section"><div class="section-heading"><h3>${level.toUpperCase()}</h3><span class="muted">${level === "n5" ? "Beginner" : "Elementary"}</span></div>
          <div class="lesson-picker">${registry.filter((lesson) => lesson.level === level).map((lesson) => {
            const key = `${lesson.level}-${lesson.number}`;
            return `<button class="lesson-chip ${state.selectedLessons.has(key) ? "is-selected" : ""}" data-action="toggle-lesson" data-key="${key}" type="button" aria-pressed="${state.selectedLessons.has(key)}">${String(lesson.number).padStart(2, "0")}</button>`;
          }).join("")}</div>
        </div>`).join("")}
    </section>
    <p class="muted" id="quiz-availability">Checking selected lesson vocabulary…</p>
    <button class="button" id="start-quiz" type="button" disabled>Start quiz →</button>
  `;
  bindActions();
  selectedWordsPromise.then((words) => {
    const button = document.querySelector("#start-quiz");
    const availability = document.querySelector("#quiz-availability");
    if (!button || !availability) return;
    availability.textContent = words.length
      ? `${words.length} available word${words.length === 1 ? "" : "s"} across ${selected.length} selected lesson${selected.length === 1 ? "" : "s"}.`
      : "No vocabulary in the selected lessons yet. Add entries to the lesson files to enable quizzes.";
    button.disabled = words.length < 2;
    button.addEventListener("click", () => startQuiz(words, document.querySelector("#quiz-mode").value, document.querySelector("#quiz-count").value));
  }).catch(showError);
}

function renderQuizQuestion() {
  if (!state.quiz?.questions.length) return navigate("quiz");
  const quiz = state.quiz;
  const question = quiz.questions[quiz.index];
  const answered = quiz.answer !== null;
  main.innerHTML = `
    <div class="quiz-wrap">
      <div class="quiz-topline"><button class="text-button" data-action="exit-quiz" type="button">← Exit quiz</button><span>Question ${quiz.index + 1} of ${quiz.questions.length}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.round((quiz.index / quiz.questions.length) * 100)}%"></div></div>
      <section class="quiz-card">
        <p class="quiz-prompt-label">${question.mode === "context" ? "Example sentence" : question.mode === "bn-jp" ? "Choose the Japanese" : "Choose the Bangla meaning"}</p>
        <p class="quiz-prompt" lang="${question.mode === "bn-jp" ? "bn" : "ja"}">${escapeHtml(question.prompt)}</p>
        ${question.subprompt ? `<p class="quiz-subprompt">${escapeHtml(question.subprompt)}</p>` : ""}
      </section>
      <div class="quiz-choices">${question.choices.map((choice, index) => `
        <button class="choice-button ${answered && choice === question.answer ? "is-correct" : ""} ${answered && choice === quiz.answer && choice !== question.answer ? "is-wrong" : ""}" data-action="answer" data-choice="${escapeAttribute(choice)}" type="button" ${answered ? "disabled" : ""}>
          <span class="choice-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(choice)}</span>
        </button>`).join("")}</div>
      ${answered ? `<p class="answer-feedback ${quiz.answer === question.answer ? "is-correct" : "is-wrong"}" role="status">${quiz.answer === question.answer ? "Correct — nice work!" : `Not quite. Correct answer: ${escapeHtml(question.answer)}`}</p><div class="section"><button class="button" data-action="next-question" type="button">${quiz.index + 1 === quiz.questions.length ? "See results" : "Next question →"}</button></div>` : ""}
    </div>`;
  bindActions();
}

function renderQuizResults() {
  const quiz = state.quiz;
  if (!quiz?.results) return navigate("home");
  const { correct, wrong } = quiz.results;
  const accuracy = quiz.questions.length ? Math.round((correct / quiz.questions.length) * 100) : 0;
  main.innerHTML = `
    ${pageHeading("Quiz complete", "A good review is progress, whatever the score.")}
    <section class="panel quiz-wrap">
      <p class="eyebrow">Your score</p><p class="result-score">${correct}<span class="muted">/${quiz.questions.length}</span></p>
      <div class="progress-row"><strong>Accuracy</strong><strong>${accuracy}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${accuracy}%"></div></div>
      <p class="muted section">${correct} correct · ${wrong.length} wrong</p>
      <div class="button-row"><button class="button" data-action="retry-mistakes" type="button" ${wrong.length ? "" : "disabled"}>Retry mistakes</button><button class="button button-secondary" data-action="quiz" type="button">New quiz</button></div>
    </section>
    ${wrong.length ? `<section class="section panel"><h2>Words to revisit</h2>${wrong.map(({ question, answer }) => `
      <article class="mistake-card"><strong class="word-japanese" lang="ja">${escapeHtml(question.word.japanese)}</strong><span class="muted">${escapeHtml(question.word.romaji)}</span><span class="word-meaning" lang="bn">${escapeHtml(question.word.bangla)}</span>
      <span class="mistake-answer">Your answer: ${escapeHtml(answer)}</span><span class="mistake-answer">Correct answer: ${escapeHtml(question.answer)}</span></article>`).join("")}</section>` : ""}
  `;
  bindActions();
}

function renderReview() {
  const words = state.words.filter((word) => (state.progress[word.id]?.wrong ?? 0) > 0);
  const sorted = [...words].sort((a, b) => (state.progress[b.id]?.wrong ?? 0) - (state.progress[a.id]?.wrong ?? 0));
  main.innerHTML = `
    ${pageHeading("Review", "Practise words you have missed before. Each word is identified by its stable vocabulary ID.")}
    ${sorted.length ? `<p class="muted">${sorted.length} word${sorted.length === 1 ? "" : "s"} have at least one incorrect answer.</p><div class="button-row"><button class="button" data-action="review-quiz" type="button">Quiz these words →</button></div><section class="section word-list">${sorted.map((word) => `<article class="word-card">${renderWordContent(word)}<div class="section"><span class="tag tag-warning">${state.progress[word.id].wrong} incorrect</span> <span class="tag">${state.progress[word.id].status}</span></div></article>`).join("")}</section>` : `
      <div class="empty-state"><h2>No mistakes to review yet</h2><p>Words you answer incorrectly will appear here automatically. Start a quiz when you have added vocabulary.</p><button class="button" data-action="quiz" type="button">Set up a quiz</button></div>`}
  `;
  bindActions();
}

function renderProgress() {
  const allWords = state.words;
  const stats = summarizeProgress(state.progress, allWords);
  const levels = ["n5", "n4"].map((level) => {
    const levelWords = allWords.filter((word) => word.id.startsWith(`${level}-`));
    const levelStats = summarizeProgress(state.progress, levelWords);
    return { level, ...levelStats };
  });
  main.innerHTML = `
    ${pageHeading("Progress", "Your history stays on this device and is tracked separately for every vocabulary ID.")}
    <div class="stats-grid">${statCard(stats.learned, "Words mastered")}${statCard(stats.due, "Due to review")}${statCard(stats.wrong, "Words to practise")}${statCard(`${stats.accuracy}%`, "Quiz accuracy")}</div>
    <section class="section panel"><h2>Progress by level</h2>${levels.map((level) => `
      <div class="section ${level.level === "n4" ? "section" : ""}">
        <div class="progress-row"><strong>${level.level.toUpperCase()}</strong><span>${level.learned}/${level.total} mastered</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${level.total ? Math.round(level.learned / level.total * 100) : 0}%"></div></div>
        <p class="muted section">${level.attempts} answers · ${level.accuracy}% accuracy</p>
      </div>`).join("")}
      <p class="muted">Vocabulary loaded into this session: ${allWords.length}. Lessons without entries are not included in these totals.</p>
    </section>
    <section class="section panel"><h2>On-device storage</h2><p class="muted">Progress is saved in this browser's local storage. Clearing browser site data will remove it. Vocabulary IDs keep your study history attached to the same word even if you reorder a lesson.</p><button class="button button-secondary" data-action="export-progress" type="button">Export progress JSON</button></section>
  `;
  bindActions();
}

function renderGrammar() {
  main.innerHTML = `
    ${pageHeading("Grammar library", "Grammar has its own future data area and is kept separate from vocabulary and quiz progress.")}
    <div class="empty-state"><h2>Ready for grammar lessons</h2><p>Nothing is included yet. Grammar entry files belong under <code>data/grammar/{n5,n4,n3}/</code>; this vocabulary app does not mix grammar data into lesson vocabulary.</p></div>
  `;
}

function bindActions() {
  main.querySelectorAll("[data-action]").forEach((element) => {
    element.addEventListener("click", async () => {
      const { action } = element.dataset;
      try {
        if (action === "open-lessons") navigate("learn");
        if (action === "progress") navigate("progress");
        if (action === "quiz") navigate("quiz");
        if (action === "review") navigate("review");
        if (action === "grammar") navigate("grammar");
        if (action === "level") {
          state.selectedLesson = { level: element.dataset.level, number: element.dataset.level === "n5" ? 1 : 26 };
          if (state.route === "home") navigate("learn");
          else render();
        }
        if (action === "lesson") {
          state.selectedLesson = { level: element.dataset.level, number: Number(element.dataset.number) };
          state.route = "lesson";
          render();
        }
        if (action === "adjacent-lesson") {
          state.selectedLesson.number += Number(element.dataset.direction);
          render();
        }
        if (action === "toggle-lesson") {
          const key = element.dataset.key;
          state.selectedLessons.has(key) ? state.selectedLessons.delete(key) : state.selectedLessons.add(key);
          renderQuizSetup();
        }
        if (action === "select-all") {
          registry.forEach((lesson) => state.selectedLessons.add(`${lesson.level}-${lesson.number}`));
          renderQuizSetup();
        }
        if (action === "clear-all") {
          state.selectedLessons.clear();
          renderQuizSetup();
        }
        if (action === "quiz-current-lesson") {
          const words = await loadLesson(state.selectedLesson.level, state.selectedLesson.number);
          startQuiz(words, "jp-bn", "all");
        }
        if (action === "answer") answerQuestion(element.dataset.choice);
        if (action === "next-question") advanceQuiz();
        if (action === "exit-quiz") navigate("quiz");
        if (action === "retry-mistakes") retryMistakes();
        if (action === "review-quiz") startQuiz(
          state.words.filter((word) => (state.progress[word.id]?.wrong ?? 0) > 0),
          "jp-bn",
          "all",
          state.words
        );
        if (action === "export-progress") exportProgress();
      } catch (error) {
        showError(error);
      }
    });
  });
}

async function startQuiz(words, mode, count, distractorPool = words) {
  const questions = createQuiz(words, { mode, count, distractorPool });
  if (questions.length < 2) {
    showToast("Add at least two vocabulary entries to quiz these lessons.");
    return;
  }
  state.quiz = { questions, index: 0, answer: null, results: null, correct: 0, wrong: [], distractorPool };
  state.route = "quiz-run";
  render();
}

function answerQuestion(choice) {
  const quiz = state.quiz;
  if (!quiz || quiz.answer !== null) return;
  const question = quiz.questions[quiz.index];
  const result = gradeQuestion(question, choice);
  quiz.answer = choice;
  if (result.correct) quiz.correct += 1;
  else quiz.wrong.push({ question, answer: choice });
  state.words = [...new Map([...state.words, question.word].map((word) => [word.id, word])).values()];
  try {
    recordAnswer(state.progress, question.word.id, result.correct);
  } catch (error) {
    render();
    showError(error);
    return;
  }
  render();
}

function advanceQuiz() {
  const quiz = state.quiz;
  if (quiz.index + 1 < quiz.questions.length) {
    quiz.index += 1;
    quiz.answer = null;
    render();
    return;
  }
  quiz.results = { correct: quiz.correct, wrong: quiz.wrong };
  state.route = "quiz-results";
  render();
}

function retryMistakes() {
  const wrongWords = [...new Map(state.quiz.results.wrong.map(({ question }) => [question.word.id, question.word])).values()];
  if (!wrongWords.length) {
    showToast("There are no mistakes to retry.");
    return;
  }
  startQuiz(wrongWords, "jp-bn", "all", state.quiz.distractorPool);
}

function selectedLessonEntries() {
  return registry.filter((lesson) => state.selectedLessons.has(`${lesson.level}-${lesson.number}`));
}

function dataNotice() {
  return `<section class="section callout"><strong>Vocabulary data slots are ready.</strong> The 50 lesson files currently contain no entries; no sample or textbook list has been substituted. See <a href="./README.md">the setup guide</a> for the beginner-friendly lesson format and how to add data.</section>`;
}

function emptyLesson(title) {
  return `<div class="empty-state"><h2>${escapeHtml(title)} is ready for vocabulary</h2><p>This lesson file is an empty data slot, not a completed vocabulary list. Add words using the format in the setup guide, and they will appear here automatically.</p><a class="button button-secondary" href="./README.md">Open the setup guide</a></div>`;
}

function renderWordContent(word) {
  return `<div class="word-head"><div><h2 class="word-japanese" lang="ja">${escapeHtml(word.japanese)}</h2><p class="word-romaji">${escapeHtml(word.romaji)}</p><p class="word-meaning" lang="bn">${escapeHtml(word.bangla)}</p></div></div>${word.example ? `<div class="example"><p class="example-japanese" lang="ja">${escapeHtml(word.example.japanese)}</p><p class="example-romaji">${escapeHtml(word.example.romaji)}</p><p class="example-bangla" lang="bn">${escapeHtml(word.example.bangla)}</p></div>` : ""}`;
}

function pageHeading(title, description) {
  return `<header class="page-heading"><p class="eyebrow">Kotoba · Study</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></header>`;
}

function statCard(value, label) {
  return `<article class="stat-card"><span class="stat-value">${escapeHtml(String(value))}</span><span class="stat-label">${escapeHtml(label)}</span></article>`;
}

function initializeTheme() {
  let theme;
  try { theme = localStorage.getItem("kotoba-theme"); } catch (error) { console.error("Could not read theme preference.", error); }
  if (theme !== "dark" && theme !== "light") theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(theme);
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(theme);
  try { localStorage.setItem("kotoba-theme", theme); } catch (error) { showError(error); }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector("#theme-toggle span").textContent = theme === "dark" ? "☀" : "☾";
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#151c19" : "#f5f6f2";
}

function updateConnectionStatus() {
  const status = document.querySelector("#connection-status");
  status.textContent = navigator.onLine ? "Online" : "Offline";
  status.classList.toggle("is-offline", !navigator.onLine);
}

function exportProgress() {
  const file = new Blob([JSON.stringify(state.progress, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kotoba-progress.json";
  link.click();
  URL.revokeObjectURL(url);
}

function showError(error) {
  console.error(error);
  showToast(error instanceof Error ? error.message : String(error));
}

function reportError(error) {
  console.error(error);
  setTimeout(() => showToast(error.message), 0);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3800);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
