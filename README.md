# Kotoba — Japanese study

A mobile-first, plain HTML/CSS/JavaScript PWA for personal Japanese vocabulary study. It needs no account, server-side database, framework, or third-party runtime library. Japanese is displayed kana-first; optional `kanji` values are metadata. Study history is saved in this browser.

## Important vocabulary status

The full app architecture and all **50 individual N5/N4 lesson data files** are present, but those files are empty slots. No textbook vocabulary has been copied in, and the app does not claim the curriculum data is complete. The Minna no Nihongo lesson-by-lesson lists are copyrighted source material; add vocabulary you have the right to use, or request a small, specifically scoped set of independently written entries. Each file accepts the same format.

## Project tree

```text
.
├── index.html
├── style.css
├── app.js
├── data-loader.js
├── progress.js
├── quiz.js
├── sw.js
├── manifest.json
├── package.json
├── README.md
├── assets/
│   └── icon.svg
├── data/
│   ├── lesson-registry.js
│   ├── n5/
│   │   ├── lesson01.js
│   │   ├── lesson02.js
│   │   ├── lesson03.js
│   │   ├── lesson04.js
│   │   ├── lesson05.js
│   │   ├── lesson06.js
│   │   ├── lesson07.js
│   │   ├── lesson08.js
│   │   ├── lesson09.js
│   │   ├── lesson10.js
│   │   ├── lesson11.js
│   │   ├── lesson12.js
│   │   ├── lesson13.js
│   │   ├── lesson14.js
│   │   ├── lesson15.js
│   │   ├── lesson16.js
│   │   ├── lesson17.js
│   │   ├── lesson18.js
│   │   ├── lesson19.js
│   │   ├── lesson20.js
│   │   ├── lesson21.js
│   │   ├── lesson22.js
│   │   ├── lesson23.js
│   │   ├── lesson24.js
│   │   └── lesson25.js
│   ├── n4/
│   │   ├── lesson26.js
│   │   ├── lesson27.js
│   │   ├── lesson28.js
│   │   ├── lesson29.js
│   │   ├── lesson30.js
│   │   ├── lesson31.js
│   │   ├── lesson32.js
│   │   ├── lesson33.js
│   │   ├── lesson34.js
│   │   ├── lesson35.js
│   │   ├── lesson36.js
│   │   ├── lesson37.js
│   │   ├── lesson38.js
│   │   ├── lesson39.js
│   │   ├── lesson40.js
│   │   ├── lesson41.js
│   │   ├── lesson42.js
│   │   ├── lesson43.js
│   │   ├── lesson44.js
│   │   ├── lesson45.js
│   │   ├── lesson46.js
│   │   ├── lesson47.js
│   │   ├── lesson48.js
│   │   ├── lesson49.js
│   │   └── lesson50.js
│   ├── n3/
│   │   └── README.md
│   └── grammar/
│       ├── n5/README.md
│       ├── n4/README.md
│       └── n3/README.md
└── test/
    ├── quiz.test.js
    └── progress.test.js
```

## What the files do

- `index.html`, `style.css`: responsive app shell, phone-first controls, light/dark styles.
- `app.js`: screens and application state; it contains no vocabulary list.
- `data/lesson-registry.js`: lesson catalogue and the single registration point for adding lessons.
- `data-loader.js`: lazy-imports lesson modules and checks required fields, ID prefixes, duplicate IDs within a lesson, and example structure.
- `data/n5/lessonNN.js`, `data/n4/lessonNN.js`: independent, editable vocabulary arrays. All 50 files are currently empty.
- `quiz.js`: shared question generation and answer grading for any level.
- `progress.js`: LocalStorage persistence, mastery/review timing, and summary calculations.
- `sw.js`, `manifest.json`, `assets/icon.svg`: install metadata, app icon, and offline caching for the app and all 50 current lesson files.
- `data/n3/`, `data/grammar/`: extension points; grammar is intentionally separate from vocabulary.
- `test/`: focused Node tests for quiz generation and saved progress.

## Run locally

Use a local HTTP server (ES modules and service workers do not work correctly from a `file://` URL):

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. Alternatively run `npx serve .` if Node/npm is installed. On first load, the service worker caches the shell and current vocabulary files. Use HTTPS in deployment; localhost is treated as secure for development. Progress belongs to the browser and origin, so it is not shared between devices or between different deployment domains.

Run the automated checks with:

```sh
npm test
```

## Edit vocabulary (beginner guide)

Open a lesson, for example `data/n5/lesson01.js`. Entries are ordinary JavaScript objects in an array:

```js
export default [
  {
    id: "n5-l01-001",
    japanese: "たべます",
    kanji: "食べます",
    romaji: "tabemasu",
    bangla: "খাওয়া",
    wordType: "verb",
    example: {
      japanese: "りんごを たべます。",
      romaji: "Ringo o tabemasu.",
      bangla: "আপেল খাই।"
    }
  }
];
```

- **Edit a word:** change its `japanese`, `romaji`, `bangla`, optional `kanji`, or `wordType` text. To change an example, edit its three strings in `example`.
- **Add a word:** copy one object, paste it into the array with a comma between entries, and give it a new, permanent ID. Keep kana in `japanese`; use `kanji` only as optional metadata. The app needs non-empty `id`, `japanese`, `romaji`, and `bangla`.
- **Delete a word:** remove its whole object (including the comma that separates it from its neighbour). Existing progress for the removed ID remains in LocalStorage but will not be shown unless that ID is used again.
- **Change Bangla meaning:** edit the `bangla` string, and also update `example.bangla` if its sentence translation needs to change.
- **IDs:** use `n5-l01-001`, `n5-l01-002`, … for N5 lesson 1; use the corresponding level and lesson in every ID (e.g. `n4-l26-001`). Never renumber an existing word just because its position changes. IDs connect progress to the word.
- **Categories:** `noun`, `verb`, `い-adjective`, `な-adjective`, `adverb`, `particle`, `expression`, `counter`, or `other` are useful suggestions; `wordType` is optional.

Only add sentences and translations that you have checked. Keep example Japanese beginner-friendly and kana-first.

## Add a new lesson or level

The lesson loader uses a small explicit registry so no bundler or server-side directory listing is needed.

1. Create one data file. For example create `data/n3/lesson01.js` with the same `export default [ { ... } ]` shape as above. For IDs use `n3-l01-001`, `n3-l01-002`, and so on.
2. Register it in `data/lesson-registry.js`. Add an object with the level, lesson number, title, and path:

   ```js
   { level: "n3", number: 1, title: "Lesson 01", path: "./data/n3/lesson01.js" }
   ```

3. Add N3 to the level/lesson picker UI in `app.js` when you want learners to select it there. The lesson data loader, question generator, grading, and ID-keyed progress logic do not need N3-specific copies or rewrites.
4. Add that file to the `APP_FILES` list in `sw.js` so it is available immediately offline after the next app load. (The existing N5/N4 files are generated into that list automatically.)
5. Run `npm test`, start the local HTTP server, open the lesson, then test a quiz and refresh to check that progress persists.

For an additional N5/N4 lesson, use the matching ID convention and add its one object to `data/lesson-registry.js`; add its path to `sw.js` too. No changes to `app.js` or quiz logic are needed for an already supported level.

## Add grammar later

Keep grammar out of the vocabulary arrays. Create a grammar module under `data/grammar/n5/`, `data/grammar/n4/`, or `data/grammar/n3/` (for example `lesson01.js`) with its own `id`, `title`, `explanation`, `formation`, `examples`, `notes`, and `relatedVocabulary` fields. Then build grammar-specific loading/rendering separately. The current Grammar screen is an honest placeholder; grammar questions are not yet implemented.

## Quiz, review, and progress

- Choose individual lessons or select/clear all, then pick Japanese → Bangla, Bangla → Japanese, example context, or random direction. Questions are drawn from the selected lesson words; distractors come from the same selected vocabulary pool. A choice is correct only when it exactly matches the target meaning/word.
- Mistakes are listed after the quiz and are available in **Review**. Retry uses the wrong words as prompts and vocabulary from the same quiz selection for distractors.
- Each answer updates the record under its stable vocabulary ID: attempts, correct/wrong counts, mastery, status, last-reviewed time, and next-review time. This first version uses a small rule-based interval, separate from vocabulary and quiz logic, so the scheduler can later be replaced with SM-2/FSRS without changing lesson data.
- Browser LocalStorage survives refreshes. The Progress screen can export a JSON backup. Browser data clearing removes local progress.

## Offline and deployment

The service worker precaches the shell and all 50 N5/N4 lesson files. It is registered on page load and serves the cached app for offline navigation. A new lesson added later must also be listed in `sw.js` to be included in the initial offline download. When changing the service worker’s cache contents/behavior, increment `CACHE_NAME` to publish a fresh cache version.

- **GitHub Pages:** publish the repository root (or configure Pages to publish the directory containing `index.html`) from a branch or GitHub Actions. Open the published HTTPS URL once online to install the offline cache.
- **Netlify:** deploy the repository root as a static site; no build command or publish directory changes are needed. Open the HTTPS site once to cache it.
- Always test offline using browser developer tools or airplane mode after the first successful load. This app uses no network service for its core functionality.
