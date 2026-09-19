# home

Cloudflare Workers 프로젝트 (Java/Spring Boot 미사용, JS/TS만 사용).

- 정적 자산: `public/` (배포 시 이 디렉토리를 서빙)
- 배포: `npm run deploy` (wrangler deploy)
- 개발 서버: `npm run dev` (wrangler dev)
- 배포 URL: https://home.souk2109.workers.dev

## 청약 API 연동

청약홈 분양정보 조회 Open API(ApplyhomeInfoDetailSvc) 연동 시 아래 가이드 문서를 참고한다.

@docs/청약_API_가이드.md

**지역 범위: 서울·경기만 다룬다.** 10개 엔드포인트 모두 조회 화면에서 `cond[SUBSCRPT_AREA_CODE_NM::EQ]`를 서울/경기로 고정해 두 지역 결과만 합쳐서 보여준다 (지역 선택 UI 없음). `public/apt-detail.html`이 이 패턴의 참고 구현.

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

**`totalCount` vs `matchCount` 주의.** 응답의 `totalCount`는 cond 조건과 무관하게 항상 해당 엔드포인트의 전체 데이터셋 크기를 반환한다(고정값). 실제 "내 조건에 맞는 건수"는 `matchCount`를 써야 한다. 조건별 건수를 화면에 표시할 땐 반드시 `matchCount`를 합산할 것.

**페이징: 화면 표시는 15건/페이지, "페이지당 개수" 입력 UI는 없음.** 서울·경기 두 지역을 각각 별도 요청(perPage=`FETCH_LIMIT`=100)으로 넉넉히 받아온 뒤 합치고 정렬해서, 화면에서는 그 배열을 15건씩 잘라 이전/다음 버튼으로 넘기는 **클라이언트 사이드 페이징**이다 (페이지 넘길 때 추가 API 호출 없음). `apt-detail.html`의 `renderPage()`가 참고 구현.

**지역 제외(NOT LIKE) 필터.** API의 cond 연산자는 `EQ`/`LIKE`/`LT`/`LTE`/`GT`/`GTE`뿐이라 "특정 지역 제외" 같은 NOT 조건이 없다. 그래서 이건 서버에 못 넘기고, `HSSPLY_ADRES`(공급위치)에 제외 키워드가 포함된 행을 응답을 받은 뒤 **클라이언트에서 필터링**한다 (`apt-detail.html`의 `excludeAreas` 입력 + submit 핸들러 참고). 이 경우 화면에 보여줄 건수는 API의 `matchCount`가 아니라 제외 필터까지 적용한 뒤의 실제 배열 길이를 써야 한다.

**API가 가끔 자정 무렵 빈 데이터를 준다.** "데이터 갱신주기: 매일"이라 한국시간 자정 즈음 짧게 `matchCount`/`totalCount`가 0으로 나오는 경우를 관찰함(우리 쪽 버그 아님, 청약홈 쪽 일일 배치 갱신 타이밍으로 추정). 이 시간대에 조회가 0건이면 재시도해볼 것.

## 로그인 (D1 기반 세션 인증)

외부 무단 접근 차단을 위해 전체 사이트(정적 페이지 + `/api/*`)가 로그인 뒤에 있다.

- D1 DB: `home-db` (바인딩 `env.DB`), 테이블: `users`(email/password_hash/salt), `sessions`(id/user_id/expires_at). 스키마: `schema.sql`
- 비밀번호: PBKDF2-SHA256(10만 반복) 해시, `src/auth.js`
- 세션: `HttpOnly` 쿠키(`session=<랜덤 32바이트 hex>`), 30일 만료, D1 `sessions` 테이블에서 검증
- `wrangler.jsonc`의 `assets.run_worker_first: true`로 Worker가 모든 요청을 가로채 인증 확인 후 `env.ASSETS.fetch()`로 정적 파일을 서빙한다 — 새 페이지를 추가해도 이 로직을 따로 건드릴 필요 없음
- 예외 경로(비로그인 허용): `/login`, `/assets/*`, `/api/login`
- 계정 생성/비밀번호 변경: `node scripts/create-user.mjs`를 **본인 터미널에서 직접 실행** (비밀번호가 대화 로그에 남지 않도록 이 방식 유지할 것)
- 새 페이지를 만들 때는 `public/apt-detail.html`처럼 헤더에 로그아웃 링크(`id="logout-link"`)와 `<script src="/assets/logout.js" defer>`를 포함시킨다
