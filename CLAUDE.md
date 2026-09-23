# home

Cloudflare Workers 프로젝트 (Java/Spring Boot 미사용, JS/TS만 사용).

- 정적 자산: `public/` (배포 시 이 디렉토리를 서빙)
- 배포: `npm run deploy` (wrangler deploy)
- 개발 서버: `npm run dev` (wrangler dev)
- 배포 URL: https://home.souk2109.workers.dev

## PWA (홈 화면에 앱처럼 설치)

- `public/manifest.json`, `public/sw.js`, `public/assets/icons/icon-192.png`/`icon-512.png`가 PWA 구성요소. 아이콘은 외부 이미지 라이브러리 없이 Node 내장 `zlib`만으로 직접 PNG를 인코딩해서 만들었다(사용한 스크립트는 저장하지 않음 — 아이콘을 다시 바꿔야 하면 같은 방식으로 새로 생성).
- `src/index.js`의 `injectPageEnhancements(response, user)`가 정적 HTML을 서빙하기 직전에 `<head>`에 manifest/아이콘/`theme-color`를(`HEAD_EXTRA`), `<body>` 시작 부분에 서비스 워커 등록 스크립트를(`SW_REGISTER_SCRIPT`) 끼워 넣는다. `user`가 있으면(로그인 상태) 헤더 nav(`buildSharedHeader`)도 같이 넣는다 — 로그인 페이지는 `user=null`로 호출돼 nav 없이 PWA 태그만 들어간다.
- `manifest.json`/`sw.js`는 로그인 여부와 무관하게 접근 가능하도록 인증 예외 경로에 추가돼 있다(`/login`, `/assets/*`와 동일하게 취급). 민감정보가 없으므로 안전.
- **서비스 워커는 `/assets/*` 정적 자산만 network-first로 캐싱하고, HTML 페이지·`/api/*` 응답은 절대 캐싱하지 않는다** — 로그인 후 개인 데이터가 로그아웃 뒤에도 기기에 남는 걸 방지하기 위한 의도적 설계. 네트워크 우선이라 배포하면 다음에 앱을 열 때 바로 최신 버전이 반영되고, 오프라인일 때만 캐시를 사용한다. `skipWaiting()`+`clients.claim()`으로 새 서비스 워커도 즉시 활성화되므로 **사용자가 재설치하거나 캐시를 지울 필요가 없다.**
- 설치 방법: 안드로이드는 브라우저가 자동으로 "설치" 배너를 띄우고, iOS(Safari)는 공유 버튼 → "홈 화면에 추가"를 직접 눌러야 한다(iOS는 설치 프롬프트 자체가 없음).

## 사용량 확인 (무료 플랜 한도 체크용)

**D1(읽기/쓰기/저장용량)은 한 줄로 확인 가능:**
```
wrangler d1 info home-db
```
`database_size`(저장용량), `read_queries_24h`/`rows_read_24h`(24시간 읽기), `write_queries_24h`/`rows_written_24h`(24시간 쓰기)를 한 번에 보여준다.

| 항목 | 무료 플랜 한도 |
|---|---|
| D1 저장 용량 | 5GB |
| D1 읽기(rows read) | 하루 500만 건 |
| D1 쓰기(rows written) | 하루 10만 건 |
| Workers 요청 수 | 하루 100,000건 |

**Workers 요청 수는 CLI 명령어가 없다** (`wrangler`에 별도 analytics/metrics 서브커맨드 없음) — Cloudflare 대시보드에서 확인해야 한다: dash.cloudflare.com → Workers & Pages → `home` → Metrics 탭.

**배포(`wrangler deploy`) 자체는 횟수 제한이 없다** — 위 표는 전부 "런타임 사용량"(요청 처리, DB 읽기/쓰기)에 대한 것이지 배포 빈도와는 무관하다.

## 청약 API 연동

청약홈 분양정보 조회 Open API(ApplyhomeInfoDetailSvc) 연동 시 아래 가이드 문서를 참고한다.

@docs/청약_API_가이드.md

**"조회형" 엔드포인트(현재 APT, 오피스텔/도시형/민간임대)는 라이브 프록시가 아니라 배치 수집 + D1 조회 방식이다.** 설정 기반 공통 구조로 만들어져 있어 새 엔드포인트 추가가 쉽다.

- `src/index.js`의 `LISTING_TYPES` 객체가 유일한 설정 지점이다. 각 항목은 `tableName`/`servicePath`/`columns`/`pkColumns`/`announceDateField`(증분 수집 기준일)/`deadlineField`(마감 판단 필드)/`regionField`/`addressField`/`houseNameField`를 갖는다. **새 엔드포인트를 추가하려면: 1) `schema.sql`에 테이블 추가 2) `LISTING_TYPES`에 설정 한 항목 추가 3) 조회 페이지 HTML 하나 추가(`public/urbty-detail.html` 참고, `/assets/listing-search.js` 공통 스크립트를 로드하고 `window.LISTING_CONFIG`만 정의하면 됨)** — 이게 전부다. 배치/조회 로직 자체는 손댈 필요 없다.
- **선택 필드**: `deadlineFallbackField` — 마감판단 필드가 비어있을 때 대체할 필드(예: `remndr`/`opt`의 `GNRL_RCEPT_ENDDE`). 지정하면 조회 시 `COALESCE(deadlineField, deadlineFallbackField)`로 판단한다. `dateColumns` — 원본 API가 `YYYYMMDD`(하이픈 없음) 형식을 쓰는 엔드포인트(`pblpvtrent`, `opt`)에서, 배치 저장 시 `YYYY-MM-DD`로 정규화할 날짜 컬럼 목록(`normalizeDate8()` 참고). 이 정규화 덕분에 `handleListingSearch()`의 날짜 비교/정렬은 원본 API 형식과 무관하게 항상 동일하게 동작한다. `announceDateField`가 `dateColumns`에 포함되어 있으면 배치의 증분 수집 cond 값도 자동으로 `YYYYMMDD`로 변환해서 보낸다(`fetchListingsIncremental()` 참고).
- 매일 04:00 KST(`wrangler.jsonc`의 `triggers.crons: ["0 19 * * *"]`)에 `scheduled()`가 `LISTING_TYPES`의 모든 항목에 대해 `runListingsBatch()`를 **`Promise.allSettled`로 병렬 실행**한다 — 하나가 실패해도 나머지는 계속 진행됨.
- **일일 증분 수집 방식** (전체 재수집 아님): `cond[<announceDateField>::GTE]`로 최근 `INCREMENTAL_WINDOW_DAYS`(기본 30일) 이내에 공고된 건만 가져온다. 지역 조건은 걸지 않는다 — 지역별 EQ 필터로 받으면 지역코드가 없는 전국/광역권 공고를 놓치는 문서상 알려진 갭이 있기 때문.
- **알려진 트레이드오프(의도적으로 전체 재동기화를 두지 않기로 결정함)**: 이미 발표된 공고가 나중에 수정(접수마감일 연장, 주소 정정 등)되어도 announceDateField는 바뀌지 않으므로, 그 공고가 30일 윈도우 밖으로 나가면 수정 내용이 반영되지 않는다. 각 테이블은 최초 도입 시 전체 백필을 1회 수행해 뒀으므로 기존 공고 자체가 사라지지는 않지만, 오래된 공고의 수정분은 놓칠 수 있다.
- 사용자가 조회 페이지에서 검색하면 `handleListingSearch(user, url, env, config)`가 세션의 `user`를 기준으로 `users.included_cities`(개인설정의 "포함할 지역")와 `excluded_areas`(개인설정의 "제외할 지역")를 **서버에서 직접** 읽어 SQL `WHERE` 절로 반영하고, 정렬·페이징(15건/페이지)까지 SQL에서 처리해 `{data, totalCount}`를 반환한다. 클라이언트는 지역별 병렬 호출이나 클라이언트 사이드 필터링/정렬을 하지 않는다.
- 배치 실패(청약홈 자정 갱신 등으로 1페이지가 비는 경우) 시 해당 테이블의 기존 데이터를 지우지 않고 그냥 이번 배치를 건너뛴다 — upsert 방식이라 안전.
- 각 테이블 컬럼명은 API 응답 필드명을 그대로 사용 — 새 필드를 추가하려면 `schema.sql`과 `LISTING_TYPES`의 해당 `columns` 배열을 함께 수정할 것. **문서의 필드 목록을 100% 신뢰하지 말 것** — 오피스텔 엔드포인트도 문서 예시엔 `SUBSCRPT_AREA_CODE_NM`이 빠져있었지만 실제 응답엔 존재함. 새 엔드포인트 추가 시 반드시 실제 API 응답을 한 번 찍어보고 필드명을 확정할 것.
- **알려진 제약**: 지역코드가 없는 전국/광역권 공고는 배치에는 저장되지만 `<regionField> IN (...)` 조건 특성상 어떤 지역을 선택해도 조회 결과에는 나타나지 않는다 (기존 라이브 프록시 방식에서도 동일하게 안 보였으므로 회귀 아님).
- **배치 결과 로깅 + 관리자 화면**: `runListingsBatch()`가 매 실행마다 성공/실패 여부를 `batch_runs` 테이블에 기록한다(`logBatchRun()` — 성공 시 `row_count`(+`new_count`/`updated_count`), 실패 시 `error_message`). `row_count`는 그 배치에서 API로부터 받아온 전체 건수(= 최근 30일 내 공고 전체, 신규+갱신 합산)이고, `new_count`/`updated_count`는 그중 D1에 pkColumns 기준으로 이미 있었는지 여부로 나눈 값이다 — upsert(`INSERT ... ON CONFLICT DO UPDATE`) 직전에 `countNewVsUpdated()`가 해당 rows의 pkColumns 조합이 테이블에 이미 존재하는지 별도 SELECT로 조회해서 판정한다(upsert 결과 자체로는 신규/갱신을 구분할 수 없어서 사전 조회 방식을 씀). `/admin-batch` 페이지(+ `/api/admin/batch-status`)에서 최근 30건을 **타입별 카드로 나눠** 확인할 수 있는데, **`ADMIN_EMAIL`(현재 `"souk2109"`) 계정으로 로그인했을 때만** 헤더 nav에 "배치 현황" 링크가 뜨고 페이지/API 접근이 허용된다 (그 외 계정은 `/admin-batch` 접근 시 홈으로 리다이렉트, API는 403). 관리자 계정을 바꾸려면 `src/index.js`의 `ADMIN_EMAIL` 상수만 수정하면 된다. SERVICE_KEY 만료 등으로 배치가 며칠째 계속 실패하면 이 화면에서 바로 확인 가능. **시각은 D1에 UTC로 저장돼 있어(`datetime('now')`) 페이지에서 `Asia/Seoul`로 변환해 보여준다** (`admin-batch.html`의 `formatKST()`).

**`*Mdl`(주택형별 상세, 5개) 엔드포인트는 D1 배치 없이 라이브 프록시(`proxyApi`)를 그대로 클라이언트에서 사용한다.** 상세(Detail) 5개(APT/오피스텔/잔여세대/공공지원민간임대/임의공급)는 D1 기반이지만, `*Mdl`은 지역/마감일 검색 필드 자체가 없고 `house_manage_no`+`pblanc_no`로만 단건 조회가 가능해 "검색 가능한 목록"이 아니라 "이미 아는 특정 공고의 부가정보"다. 그래서 배치 저장 없이 **카드를 펼치는 시점에 `/assets/listing-search.js`가 `config.modelApiPath`(예: `/api/apt/model`)로 라이브 프록시를 직접 호출**해 "주택형별 상세" 섹션을 지연 로딩한다 (`loadModelSection()`, 카드당 최초 1회만 fetch 후 캐시). 새 조회 페이지에 이 기능을 추가하려면 `window.LISTING_CONFIG`에 `modelApiPath`/`modelLabels`/`moneyKeys`만 정의하면 된다 (`apt-detail.html` 참고). `*Mdl`도 문서와 실응답 필드명이 다를 수 있으니 추가 시 실제 API로 검증할 것.

**접수마감 지난 공고는 기본 제외한다.** 청약접수종료일이 오늘 이전인 공고는 조회 결과에서 뺀다. 단, 엔드포인트마다 필드명·날짜형식이 다르니 주의:

| 엔드포인트 | 접수종료일 필드 | 날짜형식 |
|---|---|---|
| getAPTLttotPblancDetail | `RCEPT_ENDDE` | `YYYY-MM-DD` |
| getUrbtyOfctlLttotPblancDetail | `SUBSCRPT_RCEPT_ENDDE` | `YYYY-MM-DD` |
| getRemndrLttotPblancDetail | `SUBSCRPT_RCEPT_ENDDE` (없으면 `GNRL_RCEPT_ENDDE`) | `YYYY-MM-DD` |
| getPblPvtRentLttotPblancDetail | `SUBSCRPT_RCEPT_ENDDE` | `YYYYMMDD` (하이픈 없음) |
| getOPTLttotPblancDetail | `SUBSCRPT_RCEPT_ENDDE` (없으면 `GNRL_RCEPT_ENDDE`) | `YYYYMMDD` (하이픈 없음) |
| `*Mdl` (주택형별, 5개) | 없음 — 지역/마감일 필드 자체가 없어 house_manage_no+pblanc_no로 Detail 엔드포인트와 조합해야 필터링 가능 | - |

가이드 문서(`docs/청약_API_가이드.md`)의 각 절 "응답 메시지 명세"에서 실제 필드명을 재확인할 것 (문서와 실응답이 다를 수 있음 — 예: `PUBLIC_HOUSE_SPCLW_APPLC_AT`).

**`totalCount` vs `matchCount` 주의.** 응답의 `totalCount`는 cond 조건과 무관하게 항상 해당 엔드포인트의 전체 데이터셋 크기를 반환한다(고정값). 실제 "내 조건에 맞는 건수"는 `matchCount`를 써야 한다 (배치 수집 시 페이징 종료 조건도 `matchCount`/`totalCount`가 아니라 `data.length < perPage`로 판단 — `fetchListingsIncremental()` 참고).

**지역 제외(NOT LIKE) 필터.** API의 cond 연산자는 `EQ`/`LIKE`/`LT`/`LTE`/`GT`/`GTE`뿐이라 "특정 지역 제외" 같은 NOT 조건이 없다. D1 기반 조회형 엔드포인트(APT, 오피스텔 등)는 D1에 저장된 데이터를 SQL로 조회하므로 `NOT LIKE`를 직접 쓸 수 있다 (`handleListingSearch()` 참고). 아직 라이브 프록시인 나머지 8개 엔드포인트에 이 패턴을 적용하려면 응답을 받은 뒤 클라이언트/서버에서 별도로 필터링해야 한다.

**개인설정의 "포함할 시/도" vs "포함할 지역" vs "제외할 지역" — 3개는 서로 다른 필터다.**
- **포함할 시/도**(`users.included_cities`): 광역 단위(서울/경기 등) 체크박스. `SUBSCRPT_AREA_CODE_NM` 정확히 일치.
- **포함할 지역**(`included_areas` 테이블): 주소 키워드(예: "판교") 기반. 하나라도 등록되어 있으면 그중 **하나라도** 주소에 포함된 공고만 표시(OR 조건).
- **제외할 지역**(`excluded_areas` 테이블): 주소 키워드 기반. 등록된 키워드가 **하나라도** 주소에 포함되면 제외(AND NOT LIKE, 전부 다 걸림).

`included_areas`/`excluded_areas` 두 테이블은 구조(user_id, area_name)가 동일해서 `src/index.js`의 `makeAreaListHandlers(tableName)` 팩토리로 GET/POST/DELETE 핸들러를 공유한다. `settings.html`도 `setupAreaList()` 공통 함수로 두 UI(포함/제외)를 만든다 — 새로 이런 종류의 목록형 설정을 추가하려면 이 두 패턴을 재사용할 것.

**API가 가끔 자정 무렵 빈 데이터를 준다.** "데이터 갱신주기: 매일"이라 한국시간 자정 즈음 짧게 `matchCount`/`totalCount`가 0으로 나오는 경우를 관찰함(우리 쪽 버그 아님, 청약홈 쪽 일일 배치 갱신 타이밍으로 추정). APT 배치는 이 시간대를 피해 04:00 KST에 실행하도록 이미 스케줄링됨.

## 로그인 (D1 기반 세션 인증)

외부 무단 접근 차단을 위해 전체 사이트(정적 페이지 + `/api/*`)가 로그인 뒤에 있다.

- D1 DB: `home-db` (바인딩 `env.DB`), 테이블: `users`(email/password_hash/salt), `sessions`(id/user_id/expires_at). 스키마: `schema.sql`
- 비밀번호: PBKDF2-SHA256(10만 반복) 해시, `src/auth.js`
- 세션: `HttpOnly` 쿠키(`session=<랜덤 32바이트 hex>`), 30일 만료, D1 `sessions` 테이블에서 검증
- `wrangler.jsonc`의 `assets.run_worker_first: true`로 Worker가 모든 요청을 가로채 인증 확인 후 `env.ASSETS.fetch()`로 정적 파일을 서빙한다 — 새 페이지를 추가해도 이 로직을 따로 건드릴 필요 없음
- 예외 경로(비로그인 허용): `/login`, `/assets/*`, `/api/login`
- 계정 생성/비밀번호 변경: `node scripts/create-user.mjs`를 **본인 터미널에서 직접 실행** (비밀번호가 대화 로그에 남지 않도록 이 방식 유지할 것)
- 새 페이지를 만들 때는 `public/apt-detail.html`처럼 `<script src="/assets/logout.js" defer>`를 포함시킨다

**헤더(로고+nav)는 각 HTML 파일에 없다 — Worker가 서빙 직전에 끼워 넣는다.** `src/index.js`의 `SHARED_HEADER` 상수 + `injectSharedHeader()`가, 로그인된 사용자에게 정적 HTML을 서빙하는 마지막 폴백(`return injectSharedHeader(await env.ASSETS.fetch(request));`)에서 응답 body의 `<body>` 바로 뒤에 헤더를 문자열 치환으로 삽입한다. **헤더를 바꿀 땐 `SHARED_HEADER` 한 곳만 수정하면 전체 페이지에 반영된다** (예전엔 페이지마다 복사돼 있어서 7곳을 따로 고쳐야 했음). 로그인 페이지(`/login`)는 비로그인 분기에서 서빙되므로 이 로직을 타지 않고 헤더 없는 원래 모습 그대로 나간다. 새 페이지를 추가할 때 `<header>` 블록을 직접 넣지 말 것 — `<body>` 열자마자 바로 `<main>`으로 시작하면 된다.

## 대출 정보 페이지 (`/loan`)

청약 종류별로 받을 수 있는 대출(LTV·DSR·총액한도)을 정리하는 **정적 페이지**다. API·D1·서버 로직을 전혀 쓰지 않고 `public/loan.html` 하나로 끝난다(계산은 전부 클라이언트 JS).

- 헤더 nav의 "대출" 링크는 `src/index.js`의 `buildSharedHeader()`에 들어 있다 — 헤더는 Worker가 서빙 직전에 주입하므로 이 한 곳만 고치면 전체 페이지에 반영된다.
- 구성: ① LTV/DTI/DSR 용어 안내(`info-box`) ② 대출 한도 계산기 ③ 청약 종류별 대출 구조(조회 페이지 5종과 1:1 대응) ④ 규제 기준 요약표 ⑤ 체크리스트 ⑥ 공식 확인처 링크.
- 계산기는 **LTV 한도 / DSR 한도 / 총액한도 중 최솟값**을 최대 대출 가능액으로 보여준다. DSR 한도는 원리금균등 역산(`principalFromAnnualPayment()`), 금리는 `대출금리 + 스트레스 가산금리`를 쓴다. 금액 입력·표시 단위는 모두 **만원**.
- **규제 수치(LTV 40/70/80%, 총액한도 6억/4억/2억, DSR 40/50%, 스트레스 가산 1.5%p)는 부동산 대책에 따라 수시로 바뀌는 값이라 하드코딩이 아니라 "기본값"으로 취급한다** — LTV는 프리셋 select + 직접 입력, 나머지도 전부 사용자가 고칠 수 있는 입력값이다. 기준이 바뀌면 `loan.html`의 select 기본값과 "규제 기준 요약" 표만 수정하면 된다.

## 대중교통 경로 조회 (구현 중)

청약 공고 주소에서 내 회사/여자친구 회사/여자친구집까지 대중교통 경로(소요시간·환승·요금)를 보여주는 기능. **TMAP(SK Open API, `openapi.sk.com`) 하나로 geocoding + 대중교통 경로를 전부 처리한다** — 시크릿 이름: `TMAP_APP_KEY`.

- **지오코딩**: `GET https://apis.openapi.sk.com/tmap/geo/fullAddrGeo` — `appKey`는 헤더가 아니라 **쿼리 파라미터**로 보내야 함(`version=1&fullAddr=<주소>&addressFlag=F00&coordType=WGS84GEO&appKey=...`). 응답은 `coordinateInfo.coordinate[0]`에 `lat`/`lon`(신주소는 `newLat`/`newLon`).
- **대중교통 요약정보**(카드 목록에 쓰는 가벼운 버전): `POST https://apis.openapi.sk.com/transit/routes/sub` — `appKey`는 **헤더**로 보냄. body: `{startX, startY, endX, endY, count}`. 응답 필드: `totalTime`(초), `transferCount`, `totalFare`, `totalWalkTime`, `totalDistance`, `pathType`. 종량제 0.55원/건.
- **대중교통 전체 경로**(구간별 legs/steps 필요할 때만): `POST https://apis.openapi.sk.com/transit/routes` — 나머지는 요약정보와 동일하되 응답이 `metaData.plan.itineraries[]` 배열이고 각 itinerary에 `fare.regular.totalFare`, `totalTime`(초), `transferCount`, `legs[]`(구간별 mode/route/station 등 상세)가 들어있음. 종량제 0.88원/건.
- **무료 티어는 하루 10건**(TMAP 대중교통 상품 기준) — 매 페이지뷰마다 호출하면 안 되고 D1(`transit_routes`)에 (사용자, 청약, 목적지) 조합당 영구 캐싱한다. 초과분은 종량제(건당 1원 미만)로 자동 전환 가능.
- **DB 스키마(schema.sql에 추가 완료, D1에도 적용됨)**:
  - `transit_destinations`(user_id, dest_key['dest1'|'dest2'|'dest3'], label, address, lng, lat) — 개인설정(`/settings`)의 목적지 3슬롯. **개수는 3개 고정이고 별명(label)만 사용자가 자유롭게 지정**한다(처음엔 완전 자유 추가/삭제 목록으로 만들었다가 "3개로 고정해달라"는 요청으로 되돌림). 주소는 다음(Daum) 우편번호 서비스를 페이지 내 모달로 임베드해서 검색으로만 입력받는다(직접 타이핑 시 오타로 지오코딩 실패하는 문제를 막기 위함) — 저장 시 서버가 Tmap 지오코딩까지 처리해 좌표를 같이 저장(`handleSaveTransitDestination`).
  - `transit_routes`(listing_type, house_manage_no, pblanc_no, dest_lng, dest_lat, total_time, transfer_count, total_fare, total_walk_time, total_distance, path_type, detail_json) — **`user_id`/`dest_key`가 아니라 목적지 좌표(dest_lng/dest_lat) 자체가 캐시 키**다. 실제 경로 계산 결과는 "이 청약 좌표 ↔ 이 목적지 좌표" 조합에만 의존하고 누가 조회했는지와는 무관하므로, 다른 사용자가 같은 목적지 좌표로 조회해도 캐시를 공유해서 TMAP 대중교통 API 무료 한도(일 10건)를 아낀다. 이 설계 덕분에 사용자가 목적지 주소를 바꿔도 캐시를 따로 지울 필요가 없다(새 좌표는 자연히 새 캐시 키가 됨). `detail_json`은 사용자가 경로를 펼칠 때만 전체 경로 API로 채우는 선택 필드.
- **폐기된 대안**: Kakao Local API + ODsay(무료 일 30건이지만 Server 플랫폼이 고정 IP를 요구해서 Cloudflare Workers의 유동 IP와 구조적으로 안 맞아 포기), 카카오모빌리티 길찾기 API(자동차 경로만 지원, 대중교통 없음).
- Windows PowerShell에서 `wrangler secret put`이 실행 정책 때문에 막히면(`.ps1` 스크립트 차단) `node_modules\.bin\wrangler.cmd`를 직접 호출하거나 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`로 우회.
- **`GET /api/transit-route?listingType=&houseManageNo=&pblancNo=&address=`** — 카드의 "길찾기" 버튼이 호출하는 정식 엔드포인트(`handleTransitRoute`). listingType은 `LISTING_TYPES`의 키와 동일. 사용자의 `transit_destinations` 3슬롯 중 채워진 것만 대상으로, 각각 `transit_routes` 캐시를 먼저 조회하고 없는 것만 청약 주소를 지오코딩(1회, 목적지들이 공유)한 뒤 "대중교통 요약정보" API로 채워서 캐싱한다. 목적지 하나가 실패해도 나머지는 정상 응답(부분 실패 허용).
- **클라이언트 확장 방법**: `LISTING_CONFIG`에 `transitButton: true`와 `listingTypeKey`(LISTING_TYPES 키)만 추가하면 그 조회 페이지에도 "길찾기" 버튼이 생긴다(`public/assets/listing-search.js`). 5개 조회 페이지(apt/urbty/remndr/pblpvtrent/opt) 전부 적용 완료.
- 버튼은 카드를 펼칠 때 자동 로드되지 않고 **명시적으로 눌렀을 때만** 호출된다(무료 한도 하루 10건을 카드 펼침만으로 소모하지 않기 위함) — `*Mdl` 주택형별 상세(카드 펼침 시 자동 로드)와는 다른 패턴이니 헷갈리지 말 것.
- 개발 중 썼던 `/api/test-transit`, `/api/test-transit-summary`, `/api/test-geocode`(admin 전용 디버그용) 임시 엔드포인트는 실제 기능 검증 후 제거 완료.
- **버그 픽스 이력: `geocodeOnce()`가 `newLon ?? lon` 대신 `newLon || lon`을 써야 한다.** Tmap `fullAddrGeo`는 지번 주소로만 매칭된 경우 신주소 좌표(`newLat`/`newLon`)를 빈 문자열("")로 내려주는데, `??`(nullish 병합)는 빈 문자열을 "값 있음"으로 취급해서 실제 좌표(`lat`/`lon`)로 대체(fallback)가 안 되는 버그가 있었다(청약 공고 주소는 대부분 "~번지 일원" 식 지번 주소라 이 버그에 항상 걸렸음 - `||`로 수정해서 해결됨).
- **참고**: 청약 공고 주소는 대부분(최근 15건 중 13건) 도로명 없이 "부산광역시 수영구 망미동 253-1번지 일원"처럼 "~번지 일원" 형식이다. `geocodeAddress()`는 원본이 실패하면 `stripAddressQualifiers()`로 "일원"/괄호 설명을 제거한 주소로 한 번 더 시도하는 보조 안전장치도 갖고 있다(위 `||` 버그 수정 이후에는 대부분 원본 그대로도 성공할 것으로 보임).
- **경로 계산 기준 시각은 "평일 오전 8시(출근 시간)"로 고정한다** (`nextWeekdayMorningDttm()`, Tmap 호출 시 `searchDttm`으로 전달). 호출 시점(주말/새벽 등)에 따라 배차 간격이 달라져 캐싱된 결과가 들쭉날쭉해지는 걸 막기 위함 — 실행 시각이 이미 그날 8시를 지났으면 다음 평일로, 주말이면 다음 월요일로 자동 이동한다.
- **요약이 아니라 전체 경로 API(`/transit/routes`)를 `count: 5`로 최초 조회 때부터 쓴다.** 무료 한도 안에서는 호출 1건 소모가 요약(`/routes/sub`)이나 전체나, `count`가 몇이든 똑같으므로(파라미터일 뿐 호출 횟수엔 영향 없음), 처음부터 후보 경로 여러 개를 받아 `transit_routes.itineraries_json`에 배열째로 저장해둔다.
- **카드에는 목적지별로 "지하철/최단시간/최소환승" 3가지를 보여준다** (`categorizeItineraries()` — fastest=totalTime 최소, fewestTransfers=transferCount 최소(동률이면 totalTime), subway=pathType===1 중 최소시간, 없으면 null). 이 분류는 저장된 `itineraries_json`에서 매번 즉석 계산하므로 캐시는 원본 후보 배열 하나만 들고 있으면 된다. `GET /api/transit-route/detail?...&category=fastest|fewestTransfers|subway`를 누르면 Tmap을 다시 안 부르고 같은 분류 로직을 D1에서 재실행해서 `legs`만 꺼내 보여준다(`handleTransitRouteDetail`).
- `slimLeg()`가 저장 전에 `passShape`(폴리라인 좌표열)·`passStopList`(전체 정류장 목록) 같은 화면에 안 쓰는 용량 큰 필드를 잘라내서 `itineraries_json` 크기를 줄인다.
- 위 변경들(고정 출발시각 도입, 전체 API 전환, 카테고리 3종 분리) 때마다 그 전 스키마로 캐싱된 `transit_routes` 기존 행은 지워서 재계산을 유도했다(테스트 단계라 몇 건 안 됨).

## 배포 완료

- ✅ Cloudflare 계정 인증 완료
- ✅ Node.js v24.21.0 설치
- ✅ npm 의존성 설치 (`npm install`)
- ✅ SERVICE_KEY 환경 변수 등록 (`wrangler secret put SERVICE_KEY`)
- ✅ 배포 완료 (2026-09-20)
  - URL: https://home.souk2109.workers.dev
  - Version ID: 699a5876-8a73-4b0f-9134-868717921463
- ✅ APT 분양정보 배치 수집 + D1 조회 전환 (2026-09-20) — Cron Trigger `0 19 * * *`(04:00 KST) 등록 확인됨, 첫 실제 배치는 익일 새벽 실행 예정
- ✅ 배치/조회 로직을 `LISTING_TYPES` 설정 기반 공통 구조로 일반화 (2026-09-20) — 오피스텔/도시형/민간임대/생활숙박시설(`urbty_listings`, `/urbty-detail`) 추가하여 검증 완료, 실데이터 정상 적재 확인됨
- ✅ 나머지 상세(Detail) 3개 엔드포인트 추가 완료 (2026-09-20): APT 잔여세대(`remndr_listings`, `/remndr-detail`), 공공지원 민간임대(`pblpvtrent_listings`, `/pblpvtrent-detail`, YYYYMMDD→YYYY-MM-DD 날짜 정규화 검증됨), 임의공급(`opt_listings`, `/opt-detail`, 날짜 정규화 + `GNRL_RCEPT_ENDDE` 마감판단 대체 로직 포함). 홈 화면의 모든 "준비중" 메뉴가 활성화됨. 상세(Detail) 5개 엔드포인트 전체가 이제 D1 기반 조회 방식.
