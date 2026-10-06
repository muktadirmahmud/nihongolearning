const CACHE_NAME = "kotoba-shell-v1";
const BASE_URL = new URL("./", self.registration.scope);
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./data-loader.js",
  "./data/lesson-registry.js",
  "./progress.js",
  "./quiz.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./data/n3/README.md",
  "./data/grammar/n5/README.md",
  "./data/grammar/n4/README.md",
  "./data/grammar/n3/README.md"
];

for (let lesson = 1; lesson <= 25; lesson += 1) {
  APP_FILES.push(`./data/n5/lesson${String(lesson).padStart(2, "0")}.js`);
}
for (let lesson = 26; lesson <= 50; lesson += 1) {
  APP_FILES.push(`./data/n4/lesson${String(lesson).padStart(2, "0")}.js`);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES.map((path) => new URL(path, BASE_URL))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("kotoba-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            cache.put(event.request, copy);
          }
          return response;
        }).catch((error) => {
          if (event.request.mode === "navigate") return cache.match(new URL("./index.html", BASE_URL));
          throw error;
        });
      })
    )
  );
});
