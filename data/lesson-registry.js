// Add one registry entry when adding a lesson; lesson data stays in its own file.
export const lessonRegistry = [
  ...Array.from({ length: 25 }, (_, index) => {
    const number = index + 1;
    return { level: "n5", number, title: `Lesson ${String(number).padStart(2, "0")}`, path: `./data/n5/lesson${String(number).padStart(2, "0")}.js` };
  }),
  ...Array.from({ length: 25 }, (_, index) => {
    const number = index + 26;
    return { level: "n4", number, title: `Lesson ${String(number).padStart(2, "0")}`, path: `./data/n4/lesson${String(number).padStart(2, "0")}.js` };
  })
];
