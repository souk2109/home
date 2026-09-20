// PWA 서비스 워커. 정적 자산(/assets/*)만 네트워크 우선(network-first)으로 캐싱해
// 오프라인 폴백을 제공한다. HTML 페이지와 /api/* 응답은 절대 캐싱하지 않는다 —
// 로그인 후 개인 데이터(검색 결과, 설정 등)가 로그아웃 뒤에도 기기에 남는 걸 방지하기 위함.
// 네트워크 우선 전략이라 소스가 배포되면 항상 최신 버전을 먼저 시도하므로,
// 캐시를 지우거나 앱을 재설치할 필요 없이 다음에 열 때 바로 반영된다.
const CACHE_NAME = "static-v1";

self.addEventListener("install", () => {
	self.skipWaiting(); // 새 버전을 기다리지 않고 즉시 활성화
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);

	if (event.request.method !== "GET" || !url.pathname.startsWith("/assets/")) {
		return; // 정적 자산 외에는 서비스 워커가 관여하지 않고 그대로 네트워크로 흘려보낸다
	}

	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			try {
				const response = await fetch(event.request);
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			} catch (err) {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				throw err;
			}
		}),
	);
});
