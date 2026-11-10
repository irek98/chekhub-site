/* ЧекХаб — service worker: офлайн-оболочка и ускорение повторных заходов.

   Логика простая, без сборщиков и зависимостей:
   - навигация (HTML) — всегда сначала сеть, кэш только как страховка:
     в офлайне отдаём копию последней открытой страницы, а если её ещё
     не открывали — /offline.html. Так обновления статей видно сразу;
   - статика (css, js, картинки, шрифты) — отдаём из кэша и параллельно
     обновляем (stale-while-revalidate). В ссылках стоит ?v=ГГГГММДД,
     поэтому после правок адрес меняется и старый кэш не мешает;
   - чужие домены (Метрика, Яндекс.Формы, Telegram) не перехватываем.

   Файл лежит в корне сайта, значит область действия — весь сайт.
   После правок поднимаем VERSION: старые кэши удалятся при активации. */

var VERSION = 'v2';
var STATIC_CACHE = 'chekhub-static-' + VERSION;
var PAGE_CACHE = 'chekhub-pages-' + VERSION;
var OFFLINE = '/offline.html';

/* что кладём в кэш сразу: офлайн-страница и её стили + иконки для установки */
var PRECACHE = [
  OFFLINE,
  '/assets/style.css',
  '/assets/bg.webp',
  '/favicon.ico',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/site.webmanifest'
];

var STATIC_RE = /\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|eot|webmanifest)$/i;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      // поштучно: один недоступный файл не должен ломать установку целиком
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name.indexOf('chekhub-') === 0 && name !== STATIC_CACHE && name !== PAGE_CACHE) {
          return caches.delete(name);
        }
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* страница из кэша: ключ без query, чтобы ?cb=1234 не мешал найти копию */
function cachedPage(request) {
  var url = new URL(request.url);
  var key = url.origin + url.pathname;
  return caches.open(PAGE_CACHE).then(function (cache) {
    return cache.match(request).then(function (hit) {
      return hit || cache.match(key);
    });
  });
}

function networkFirst(request) {
  var url = new URL(request.url);
  var key = url.origin + url.pathname;
  return fetch(request).then(function (res) {
    if (res && res.ok && res.status === 200) {
      var copy = res.clone();
      caches.open(PAGE_CACHE).then(function (cache) { cache.put(key, copy); });
    }
    return res;
  }).catch(function () {
    return cachedPage(request).then(function (hit) {
      return hit || caches.match(OFFLINE);
    });
  });
}

function staleWhileRevalidate(request) {
  return caches.open(STATIC_CACHE).then(function (cache) {
    return cache.match(request).then(function (hit) {
      var network = fetch(request).then(function (res) {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || network;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (STATIC_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/* страница может попросить активировать новую версию сразу */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
