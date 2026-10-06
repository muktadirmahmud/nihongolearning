import { lessonRegistry } from "./data/lesson-registry.js";

const loadedLessons = new Map();

export function getLessonRegistry() {
  return lessonRegistry.map(({ level, number, title }) => ({ level, number, title }));
}

export async function loadLesson(level, number) {
  const registration = lessonRegistry.find((lesson) => lesson.level === level && lesson.number === number);
  if (!registration) throw new Error(`Lesson ${level} ${number} is not registered.`);

  const cacheKey = `${level}-${number}`;
  if (loadedLessons.has(cacheKey)) return loadedLessons.get(cacheKey);

  const module = await import(registration.path);
  if (!Array.isArray(module.default)) {
    throw new Error(`${registration.path} must export a default array of vocabulary entries.`);
  }
  const words = module.default;
  validateLesson(words, level, number, registration.path);
  loadedLessons.set(cacheKey, words);
  return words;
}

export async function loadLessons(selections) {
  const lessons = await Promise.all(selections.map(({ level, number }) => loadLesson(level, number)));
  return lessons.flat();
}

function validateLesson(words, level, number, path) {
  const ids = new Set();
  for (const [index, word] of words.entries()) {
    if (!word || typeof word !== "object") throw new Error(`${path}: entry ${index + 1} must be an object.`);
    for (const key of ["id", "japanese", "romaji", "bangla"]) {
      if (typeof word[key] !== "string" || !word[key].trim()) {
        throw new Error(`${path}: entry ${index + 1} is missing a non-empty "${key}".`);
      }
    }
    if (!word.id.startsWith(`${level}-l${String(number).padStart(2, "0")}-`)) {
      throw new Error(`${path}: "${word.id}" must use the ${level} lesson ${number} ID prefix.`);
    }
    if (ids.has(word.id)) throw new Error(`${path}: duplicate vocabulary ID "${word.id}".`);
    ids.add(word.id);
    if (word.example !== undefined) {
      if (!word.example || typeof word.example !== "object" ||
          !["japanese", "romaji", "bangla"].every((key) => typeof word.example[key] === "string")) {
        throw new Error(`${path}: example for "${word.id}" must include Japanese, romaji, and Bangla strings.`);
      }
    }
  }
}
