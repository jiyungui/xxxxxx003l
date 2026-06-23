/* sw.js v4 */
const CACHE = "xingxingji-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/reset.css",
  "./css/phone.css",
  "./css/home.css",
  "./css/widgets.css",
  "./css/apps.css",
  "./css/settings.css",
  "./css/worldbook.css",
  "./css/chat.css",
  "./js/main.js",
  "./js/home.js",
  "./js/widgets.js",
  "./js/settings.js",
  "./js/worldbook.js",
  "./js/chat.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // 只缓存 GET 请求
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
