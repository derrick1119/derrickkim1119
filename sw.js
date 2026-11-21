// 쉿! UFO 서비스 워커: 한 번 연 뒤에는 오프라인에서도 열리게 한다.
// 아래 두 줄은 `npm run build` 가 실제 값으로 바꿔 넣는다(빌드하지 않아도 그대로 동작한다).
const VERSION = 'dev';
const PRECACHE = [];

const CACHE = `shh-ufo-${VERSION}`;
// 빌드하지 않은 판('dev')은 아무것도 저장하지 않는다. 저장해 두면 새 파일과 옛 파일이 섞일 수 있다.
const DEV = VERSION === 'dev';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (DEV
      ? Promise.resolve()
      : caches
          .open(CACHE)
          // HTTP 캐시에 남은 옛 파일을 새 버전 이름으로 저장하지 않도록 서버에서 다시 받는다
          .then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
          .catch(() => {})
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('shh-ufo-') && (DEV || k !== CACHE)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function fromNetwork(request, cache) {
  // 화면 이동 요청은 그대로, 나머지는 HTTP 캐시를 거치지 않고 서버에 확인한다
  const response = await fetch(request.mode === 'navigate' ? request : new Request(request, { cache: 'no-cache' }));
  if (response && response.ok && response.type === 'basic') cache.put(request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (DEV || request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // 화면 자체(HTML)는 새 버전을 먼저 받고, 안 되면 저장해 둔 것을 쓴다.
      if (request.mode === 'navigate') {
        try {
          return await fromNetwork(request, cache);
        } catch {
          return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('./index.html')) || Response.error();
        }
      }
      // 나머지 파일은 저장해 둔 것을 바로 주고, 뒤에서 새로 받아 둔다.
      const cached = await cache.match(request);
      const fresh = fromNetwork(request, cache).catch(() => null);
      return cached || (await fresh) || Response.error();
    }),
  );
});
