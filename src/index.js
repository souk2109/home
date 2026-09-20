import {
	getSessionUser,
	createSession,
	destroySessionFromRequest,
	verifyPassword,
	sessionCookieHeader,
	clearCookieHeader,
} from "./auth.js";

const BASE_URL = "https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1";

// 경로 -> 청약홈 상세기능명(영문) 매핑. 새 엔드포인트는 여기에 한 줄만 추가하면 됨.
const ENDPOINTS = {
	"/api/apt/detail": "getAPTLttotPblancDetail",
	"/api/apt/model": "getAPTLttotPblancMdl",
	"/api/urbty/detail": "getUrbtyOfctlLttotPblancDetail",
	"/api/urbty/model": "getUrbtyOfctlLttotPblancMdl",
	"/api/remndr/detail": "getRemndrLttotPblancDetail",
	"/api/remndr/model": "getRemndrLttotPblancMdl",
	"/api/pblpvtrent/detail": "getPblPvtRentLttotPblancDetail",
	"/api/pblpvtrent/model": "getPblPvtRentLttotPblancMdl",
	"/api/opt/detail": "getOPTLttotPblancDetail",
	"/api/opt/model": "getOPTLttotPblancMdl",
};

function jsonError(message, status) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "content-type": "application/json" },
	});
}

async function handleLogin(request, env) {
	let body;
	try {
		body = await request.json();
	} catch {
		return jsonError("잘못된 요청입니다", 400);
	}

	const email = body.email?.trim();
	const password = body.password;
	if (!email || !password) return jsonError("이메일/비밀번호를 입력하세요", 400);

	const user = await env.DB.prepare("SELECT id, password_hash, salt FROM users WHERE email = ?").bind(email).first();

	if (!user || !(await verifyPassword(password, user.salt, user.password_hash))) {
		return jsonError("이메일 또는 비밀번호가 올바르지 않습니다", 401);
	}

	const sessionId = await createSession(env, user.id);

	return new Response(JSON.stringify({ ok: true }), {
		headers: {
			"content-type": "application/json",
			"set-cookie": sessionCookieHeader(sessionId),
		},
	});
}

async function handleLogout(request, env) {
	await destroySessionFromRequest(request, env);
	return new Response(JSON.stringify({ ok: true }), {
		headers: {
			"content-type": "application/json",
			"set-cookie": clearCookieHeader(),
		},
	});
}

// excluded_areas/included_areas가 구조는 동일(user_id, area_name)하고 의미만 반대라서
// GET/POST/DELETE 핸들러를 테이블명만 받는 팩토리로 공유한다.
function makeAreaListHandlers(tableName) {
	async function handleGet(user, env) {
		const areas = await env.DB.prepare(`SELECT id, area_name FROM ${tableName} WHERE user_id = ? ORDER BY created_at ASC`)
			.bind(user.id)
			.all();
		return new Response(JSON.stringify({ areas: areas.results ?? [] }), {
			headers: { "content-type": "application/json" },
		});
	}

	async function handleAdd(user, request, env) {
		let body;
		try {
			body = await request.json();
		} catch {
			return jsonError("잘못된 요청입니다", 400);
		}

		const areaName = body.areaName?.trim();
		if (!areaName) return jsonError("지역명을 입력하세요", 400);

		try {
			const result = await env.DB.prepare(`INSERT INTO ${tableName} (user_id, area_name) VALUES (?, ?)`).bind(user.id, areaName).run();
			if (!result.success) return jsonError("지역 추가 실패", 500);
		} catch (err) {
			return jsonError(`지역 추가 실패: ${err.message}`, 500);
		}

		return new Response(JSON.stringify({ ok: true }), {
			headers: { "content-type": "application/json" },
		});
	}

	async function handleDelete(user, request, env) {
		let body;
		try {
			body = await request.json();
		} catch {
			return jsonError("잘못된 요청입니다", 400);
		}

		const id = body.id;
		if (!id) return jsonError("지역 ID를 입력하세요", 400);

		try {
			const result = await env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`).bind(id, user.id).run();
			if (!result.success) return jsonError("지역 삭제 실패", 500);
		} catch (err) {
			return jsonError(`지역 삭제 실패: ${err.message}`, 500);
		}

		return new Response(JSON.stringify({ ok: true }), {
			headers: { "content-type": "application/json" },
		});
	}

	return { handleGet, handleAdd, handleDelete };
}

const excludedAreaHandlers = makeAreaListHandlers("excluded_areas");
const includedAreaHandlers = makeAreaListHandlers("included_areas");

async function handleGetCities(user, env) {
	const userData = await env.DB.prepare("SELECT included_cities FROM users WHERE id = ?").bind(user.id).first();
	const includedCities = userData?.included_cities ? JSON.parse(userData.included_cities) : null;
	return new Response(JSON.stringify({ cities: includedCities }), {
		headers: { "content-type": "application/json" },
	});
}

async function handleSaveCities(user, request, env) {
	let body;
	try {
		body = await request.json();
	} catch {
		return jsonError("잘못된 요청입니다", 400);
	}

	const cities = body.cities; // null or array
	const citiesJson = cities && cities.length > 0 ? JSON.stringify(cities) : null;

	try {
		const result = await env.DB.prepare("UPDATE users SET included_cities = ? WHERE id = ?").bind(citiesJson, user.id).run();
		if (!result.success) return jsonError("도시 설정 저장 실패", 500);
	} catch (err) {
		return jsonError(`도시 설정 저장 실패: ${err.message}`, 500);
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { "content-type": "application/json" },
	});
}

// 지역코드 -> 지역명 매핑 (17개 시·도). 개인설정(public/settings.html)의 codeToName과 동일하게 유지할 것.
const REGION_CODE_TO_NAME = {
	"100": "서울", "200": "강원", "300": "대전", "312": "충남", "338": "세종",
	"360": "충북", "400": "인천", "410": "경기", "500": "광주", "513": "전남",
	"560": "전북", "600": "부산", "621": "경남", "680": "울산", "690": "제주",
	"700": "대구", "712": "경북",
};
const ALL_REGION_NAMES = Object.values(REGION_CODE_TO_NAME);
const LISTING_PAGE_SIZE = 15; // 각 조회 페이지의 기존 PAGE_SIZE와 동일하게 유지

// 매일 "최근 N일 내 공고된 것"만 증분 수집한다 (전체 재수집은 하지 않음).
// 지역 조건은 걸지 않는다 - 지역별 EQ 필터로 받으면 지역코드 없는 전국단위 공고를
// 놓치는 문서상 알려진 갭이 있기 때문 (날짜 조건만 걸면 이 갭이 발생하지 않음).
//
// 주의: 이미 발표된 공고의 내용이 나중에 수정(접수마감일 연장 등)되어도 announceDateField는
// 바뀌지 않으므로, 이 윈도우(INCREMENTAL_WINDOW_DAYS) 밖의 기존 공고가 수정되는 경우는
// 반영되지 않는다 (전체 재동기화 없이 증분만 쓰기로 한 결정에 따른 알려진 트레이드오프).
const INCREMENTAL_WINDOW_DAYS = 30;

// 조회 타입(청약홈 상세기능)별 설정. 새 엔드포인트를 추가하려면:
// 1) schema.sql에 테이블 추가  2) 여기에 설정 한 항목 추가  3) 조회 페이지 HTML 하나 추가
// 그 외 배치 수집/조회 API 로직은 아래 공통 함수들이 그대로 처리한다.
const LISTING_TYPES = {
	apt: {
		tableName: "apt_listings",
		servicePath: "/api/apt/detail",
		pkColumns: ["HOUSE_MANAGE_NO", "PBLANC_NO"],
		announceDateField: "RCRIT_PBLANC_DE",
		deadlineField: "RCEPT_ENDDE",
		regionField: "SUBSCRPT_AREA_CODE_NM",
		addressField: "HSSPLY_ADRES",
		houseNameField: "HOUSE_NM",
		// apt_listings 테이블 컬럼 = getAPTLttotPblancDetail 응답 필드명 그대로 (schema.sql과 동기화 유지)
		columns: [
			"HOUSE_MANAGE_NO", "PBLANC_NO", "HOUSE_NM", "HOUSE_SECD", "HOUSE_SECD_NM",
			"HOUSE_DTL_SECD", "HOUSE_DTL_SECD_NM", "RENT_SECD", "RENT_SECD_NM",
			"SUBSCRPT_AREA_CODE", "SUBSCRPT_AREA_CODE_NM", "HSSPLY_ZIP", "HSSPLY_ADRES",
			"TOT_SUPLY_HSHLDCO", "RCRIT_PBLANC_DE", "NSPRC_NM", "RCEPT_BGNDE", "RCEPT_ENDDE",
			"SPSPLY_RCEPT_BGNDE", "SPSPLY_RCEPT_ENDDE",
			"GNRL_RNK1_CRSPAREA_RCPTDE", "GNRL_RNK1_CRSPAREA_ENDDE",
			"GNRL_RNK1_ETC_GG_RCPTDE", "GNRL_RNK1_ETC_GG_ENDDE",
			"GNRL_RNK1_ETC_AREA_RCPTDE", "GNRL_RNK1_ETC_AREA_ENDDE",
			"GNRL_RNK2_CRSPAREA_RCPTDE", "GNRL_RNK2_CRSPAREA_ENDDE",
			"GNRL_RNK2_ETC_GG_RCPTDE", "GNRL_RNK2_ETC_GG_ENDDE",
			"GNRL_RNK2_ETC_AREA_RCPTDE", "GNRL_RNK2_ETC_AREA_ENDDE",
			"PRZWNER_PRESNATN_DE", "CNTRCT_CNCLS_BGNDE", "CNTRCT_CNCLS_ENDDE",
			"HMPG_ADRES", "CNSTRCT_ENTRPS_NM", "MDHS_TELNO", "BSNS_MBY_NM", "MVN_PREARNGE_YM",
			"SPECLT_RDN_EARTH_AT", "MDAT_TRGET_AREA_SECD", "PARCPRC_ULS_AT", "IMPRMN_BSNS_AT",
			"PUBLIC_HOUSE_EARTH_AT", "LRSCL_BLDLND_AT", "NPLN_PRVOPR_PUBLIC_HOUSE_AT",
			"PUBLIC_HOUSE_SPCLW_APPLC_AT", "PBLANC_URL",
		],
	},
	urbty: {
		tableName: "urbty_listings",
		servicePath: "/api/urbty/detail",
		pkColumns: ["HOUSE_MANAGE_NO", "PBLANC_NO"],
		announceDateField: "RCRIT_PBLANC_DE",
		deadlineField: "SUBSCRPT_RCEPT_ENDDE",
		regionField: "SUBSCRPT_AREA_CODE_NM",
		addressField: "HSSPLY_ADRES",
		houseNameField: "HOUSE_NM",
		// urbty_listings 테이블 컬럼 = getUrbtyOfctlLttotPblancDetail 응답 필드명 그대로 (실제 응답으로 검증됨)
		columns: [
			"HOUSE_MANAGE_NO", "PBLANC_NO", "HOUSE_NM", "HOUSE_SECD", "HOUSE_SECD_NM",
			"HOUSE_DTL_SECD", "HOUSE_DTL_SECD_NM", "SEARCH_HOUSE_SECD",
			"SUBSCRPT_AREA_CODE", "SUBSCRPT_AREA_CODE_NM", "HSSPLY_ZIP", "HSSPLY_ADRES",
			"TOT_SUPLY_HSHLDCO", "RCRIT_PBLANC_DE", "NSPRC_NM",
			"SUBSCRPT_RCEPT_BGNDE", "SUBSCRPT_RCEPT_ENDDE", "PRZWNER_PRESNATN_DE",
			"CNTRCT_CNCLS_BGNDE", "CNTRCT_CNCLS_ENDDE", "HMPG_ADRES",
			"BSNS_MBY_NM", "MDHS_TELNO", "MVN_PREARNGE_YM", "PBLANC_URL",
		],
	},
	remndr: {
		tableName: "remndr_listings",
		servicePath: "/api/remndr/detail",
		pkColumns: ["HOUSE_MANAGE_NO", "PBLANC_NO"],
		announceDateField: "RCRIT_PBLANC_DE",
		deadlineField: "SUBSCRPT_RCEPT_ENDDE",
		deadlineFallbackField: "GNRL_RCEPT_ENDDE", // SUBSCRPT_RCEPT_ENDDE가 없으면 이 필드로 마감판단 (실제 응답으로 필드 존재 확인됨)
		regionField: "SUBSCRPT_AREA_CODE_NM",
		addressField: "HSSPLY_ADRES",
		houseNameField: "HOUSE_NM",
		// remndr_listings 테이블 컬럼 = getRemndrLttotPblancDetail 응답 필드명 그대로 (실제 응답으로 검증됨, YYYY-MM-DD 형식이라 날짜 정규화 불필요)
		columns: [
			"HOUSE_MANAGE_NO", "PBLANC_NO", "HOUSE_NM", "HOUSE_SECD", "HOUSE_SECD_NM",
			"SUBSCRPT_AREA_CODE", "SUBSCRPT_AREA_CODE_NM", "HSSPLY_ZIP", "HSSPLY_ADRES",
			"TOT_SUPLY_HSHLDCO", "RCRIT_PBLANC_DE", "NSPRC_NM",
			"SUBSCRPT_RCEPT_BGNDE", "SUBSCRPT_RCEPT_ENDDE",
			"SPSPLY_RCEPT_BGNDE", "SPSPLY_RCEPT_ENDDE",
			"GNRL_RCEPT_BGNDE", "GNRL_RCEPT_ENDDE",
			"PRZWNER_PRESNATN_DE", "CNTRCT_CNCLS_BGNDE", "CNTRCT_CNCLS_ENDDE",
			"HMPG_ADRES", "BSNS_MBY_NM", "MDHS_TELNO", "MVN_PREARNGE_YM", "PBLANC_URL",
		],
	},
	pblpvtrent: {
		tableName: "pblpvtrent_listings",
		servicePath: "/api/pblpvtrent/detail",
		pkColumns: ["HOUSE_MANAGE_NO", "PBLANC_NO"],
		announceDateField: "RCRIT_PBLANC_DE",
		deadlineField: "SUBSCRPT_RCEPT_ENDDE",
		regionField: "SUBSCRPT_AREA_CODE_NM",
		addressField: "HSSPLY_ADRES",
		houseNameField: "HOUSE_NM",
		// 원본 API가 YYYYMMDD(하이픈 없음)를 쓰므로 저장 시 YYYY-MM-DD로 정규화한다 (아래 dateColumns 참고)
		dateColumns: [
			"RCRIT_PBLANC_DE", "SUBSCRPT_RCEPT_BGNDE", "SUBSCRPT_RCEPT_ENDDE",
			"PRZWNER_PRESNATN_DE", "CNTRCT_CNCLS_BGNDE", "CNTRCT_CNCLS_ENDDE",
		],
		// pblpvtrent_listings 테이블 컬럼 = getPblPvtRentLttotPblancDetail 응답 필드명 그대로 (실제 응답으로 검증됨)
		columns: [
			"HOUSE_MANAGE_NO", "PBLANC_NO", "HOUSE_NM", "HOUSE_SECD", "HOUSE_SECD_NM",
			"HOUSE_DETAIL_SECD", "HOUSE_DETAIL_SECD_NM", "SEARCH_HOUSE_SECD",
			"SUBSCRPT_AREA_CODE", "SUBSCRPT_AREA_CODE_NM", "HSSPLY_ZIP", "HSSPLY_ADRES",
			"TOT_SUPLY_HSHLDCO", "RCRIT_PBLANC_DE", "NSPRC_NM",
			"SUBSCRPT_RCEPT_BGNDE", "SUBSCRPT_RCEPT_ENDDE",
			"PRZWNER_PRESNATN_DE", "CNTRCT_CNCLS_BGNDE", "CNTRCT_CNCLS_ENDDE",
			"HMPG_ADRES", "BSNS_MBY_NM", "MDHS_TELNO", "MVN_PREARNGE_YM", "PBLANC_URL",
		],
	},
	opt: {
		tableName: "opt_listings",
		servicePath: "/api/opt/detail",
		pkColumns: ["HOUSE_MANAGE_NO", "PBLANC_NO"],
		announceDateField: "RCRIT_PBLANC_DE",
		deadlineField: "SUBSCRPT_RCEPT_ENDDE",
		deadlineFallbackField: "GNRL_RCEPT_ENDDE", // SUBSCRPT_RCEPT_ENDDE가 없으면 이 필드로 마감판단
		regionField: "SUBSCRPT_AREA_CODE_NM",
		addressField: "HSSPLY_ADRES",
		houseNameField: "HOUSE_NM",
		// 원본 API가 YYYYMMDD(하이픈 없음)를 쓰므로 저장 시 YYYY-MM-DD로 정규화한다
		dateColumns: [
			"RCRIT_PBLANC_DE", "SUBSCRPT_RCEPT_BGNDE", "SUBSCRPT_RCEPT_ENDDE",
			"SPSPLY_RCEPT_BGNDE", "SPSPLY_RCEPT_ENDDE", "GNRL_RCEPT_BGNDE", "GNRL_RCEPT_ENDDE",
			"PRZWNER_PRESNATN_DE", "CNTRCT_CNCLS_BGNDE", "CNTRCT_CNCLS_ENDDE",
		],
		// opt_listings 테이블 컬럼 = getOPTLttotPblancDetail 응답 필드명 그대로 (실제 응답으로 검증됨, NSPRC_NM 없음에 유의)
		columns: [
			"HOUSE_MANAGE_NO", "PBLANC_NO", "HOUSE_NM", "HOUSE_SECD", "HOUSE_SECD_NM",
			"SUBSCRPT_AREA_CODE", "SUBSCRPT_AREA_CODE_NM", "HSSPLY_ZIP", "HSSPLY_ADRES",
			"TOT_SUPLY_HSHLDCO", "RCRIT_PBLANC_DE",
			"SUBSCRPT_RCEPT_BGNDE", "SUBSCRPT_RCEPT_ENDDE",
			"SPSPLY_RCEPT_BGNDE", "SPSPLY_RCEPT_ENDDE",
			"GNRL_RCEPT_BGNDE", "GNRL_RCEPT_ENDDE",
			"PRZWNER_PRESNATN_DE", "CNTRCT_CNCLS_BGNDE", "CNTRCT_CNCLS_ENDDE",
			"HMPG_ADRES", "BSNS_MBY_NM", "MDHS_TELNO", "MVN_PREARNGE_YM", "PBLANC_URL",
		],
	},
};

// "YYYYMMDD" -> "YYYY-MM-DD" 정규화. dateColumns에 지정된 컬럼에만 적용한다.
function normalizeDate8(value) {
	if (typeof value !== "string" || !/^\d{8}$/.test(value)) return value;
	return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function buildUpsertSql(config) {
	const nonPkColumns = config.columns.filter((c) => !config.pkColumns.includes(c));
	return `
		INSERT INTO ${config.tableName} (${config.columns.join(", ")}, fetched_at)
		VALUES (${config.columns.map(() => "?").join(", ")}, ?)
		ON CONFLICT(${config.pkColumns.join(", ")}) DO UPDATE SET
			${nonPkColumns.map((c) => `${c} = excluded.${c}`).join(",\n\t\t\t")},
			fetched_at = excluded.fetched_at
	`;
}

async function fetchListingsIncremental(env, config) {
	const serviceName = ENDPOINTS[config.servicePath];
	const perPage = 100;
	const maxPages = 100; // 안전장치: 무한루프 방지 (최대 10,000건)
	const rows = [];

	const cutoffIso = new Date(Date.now() - INCREMENTAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	// 원본 API가 YYYYMMDD(하이픈 없음)를 쓰는 엔드포인트는 cond 값도 그 형식으로 보내야 한다.
	const cutoff = (config.dateColumns ?? []).includes(config.announceDateField)
		? cutoffIso.replace(/-/g, "")
		: cutoffIso;

	for (let page = 1; page <= maxPages; page++) {
		const target = new URL(`${BASE_URL}/${serviceName}`);
		target.searchParams.set("page", String(page));
		target.searchParams.set("perPage", String(perPage));
		target.searchParams.set(`cond[${config.announceDateField}::GTE]`, cutoff);
		target.searchParams.set("serviceKey", env.SERVICE_KEY);

		const upstream = await fetch(target, { headers: { accept: "application/json" } });
		if (!upstream.ok) {
			throw new Error(`청약홈 API 응답 실패 (${config.tableName}, page=${page}, status=${upstream.status})`);
		}

		const body = await upstream.json();
		const data = body.data ?? [];

		// 청약홈 자정 배치 갱신 등으로 1페이지가 비어 있으면 일시적 오류로 보고 중단한다.
		// (기존 데이터를 지우지 않는 upsert 방식이라, 여기서 중단해도 다음날 크론이 재시도한다.)
		if (page === 1 && data.length === 0) {
			throw new Error(`1페이지 응답이 비어 있음(${config.tableName}) - 일시적 오류로 간주하고 배치를 건너뜀`);
		}

		rows.push(...data);
		if (data.length < perPage) break; // matchCount/totalCount는 종료 판단에 쓰지 않음 - 이 조건으로 판단
	}

	return rows;
}

async function upsertListings(env, config, rows) {
	const BATCH_SIZE = 50; // env.DB.batch() 1회당 문장 수 (요청 크기/왕복 균형)
	const fetchedAt = new Date().toISOString();
	const sql = buildUpsertSql(config);

	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const chunk = rows.slice(i, i + BATCH_SIZE);
		const dateColumns = config.dateColumns ?? [];
		const statements = chunk.map((row) => {
			const values = config.columns.map((col) => {
				const raw = row[col] ?? null;
				return dateColumns.includes(col) ? normalizeDate8(raw) : raw;
			});
			return env.DB.prepare(sql).bind(...values, fetchedAt);
		});
		await env.DB.batch(statements);
	}
}

async function logBatchRun(env, listingType, status, rowCount, errorMessage) {
	try {
		await env.DB.prepare(
			"INSERT INTO batch_runs (listing_type, status, row_count, error_message) VALUES (?, ?, ?, ?)",
		)
			.bind(listingType, status, rowCount, errorMessage)
			.run();
	} catch (err) {
		console.error("배치 로그 기록 실패:", err);
	}
}

async function runListingsBatch(env, listingType, config) {
	try {
		if (!env.SERVICE_KEY) throw new Error("SERVICE_KEY is not configured");
		const rows = await fetchListingsIncremental(env, config);
		await upsertListings(env, config, rows);
		await logBatchRun(env, listingType, "success", rows.length, null);
		console.log(`${config.tableName} 배치 수집 완료: ${rows.length}건`);
	} catch (err) {
		await logBatchRun(env, listingType, "failure", null, err.message);
		console.error(`${config.tableName} 배치 수집 실패:`, err);
	}
}

async function handleListingSearch(user, url, env, config) {
	const userData = await env.DB.prepare("SELECT included_cities FROM users WHERE id = ?").bind(user.id).first();
	const includedCities = userData?.included_cities ? JSON.parse(userData.included_cities) : null;
	const regionNames =
		includedCities && includedCities.length > 0
			? includedCities.map((code) => REGION_CODE_TO_NAME[code]).filter(Boolean)
			: ALL_REGION_NAMES; // NULL/빈 배열 -> 전국(17개 지역) 취급, handleGetCities와 동일한 규칙

	if (regionNames.length === 0) {
		return new Response(JSON.stringify({ data: [], totalCount: 0 }), {
			headers: { "content-type": "application/json" },
		});
	}

	const excludedAreas = await env.DB.prepare("SELECT area_name FROM excluded_areas WHERE user_id = ?").bind(user.id).all();
	const excludeKeywords = (excludedAreas.results ?? []).map((row) => row.area_name);

	const includedAreas = await env.DB.prepare("SELECT area_name FROM included_areas WHERE user_id = ?").bind(user.id).all();
	const includeKeywords = (includedAreas.results ?? []).map((row) => row.area_name);

	const houseName = url.searchParams.get("houseName")?.trim() || "";
	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);

	// 접수마감이 지난 공고는 기본 제외 (deadlineField가 비어있으면 deadlineFallbackField로 대체 판단)
	const deadlineExpr = config.deadlineFallbackField
		? `COALESCE(${config.deadlineField}, ${config.deadlineFallbackField})`
		: config.deadlineField;
	const conditions = [`${deadlineExpr} >= date('now')`];
	const binds = [];

	conditions.push(`${config.regionField} IN (${regionNames.map(() => "?").join(", ")})`);
	binds.push(...regionNames);

	if (houseName) {
		conditions.push(`${config.houseNameField} LIKE ?`);
		binds.push(`%${houseName}%`);
	}

	// 공급위치에 제외 키워드가 포함된 행은 제외 (기존 client-side excludeKeywords 필터를 SQL로 이관)
	for (const keyword of excludeKeywords) {
		conditions.push(`(${config.addressField} IS NULL OR ${config.addressField} NOT LIKE ?)`);
		binds.push(`%${keyword}%`);
	}

	// 포함할 지역이 하나라도 등록되어 있으면, 그중 하나라도 공급위치에 포함된 행만 표시 (OR 조건)
	if (includeKeywords.length > 0) {
		conditions.push(`(${includeKeywords.map(() => `${config.addressField} LIKE ?`).join(" OR ")})`);
		binds.push(...includeKeywords.map((keyword) => `%${keyword}%`));
	}

	const whereClause = conditions.join(" AND ");

	const countRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM ${config.tableName} WHERE ${whereClause}`)
		.bind(...binds)
		.first();
	const totalCount = countRow?.total ?? 0;

	const offset = (page - 1) * LISTING_PAGE_SIZE;
	const listRows = await env.DB.prepare(
		`SELECT * FROM ${config.tableName} WHERE ${whereClause} ORDER BY ${config.announceDateField} DESC LIMIT ? OFFSET ?`,
	)
		.bind(...binds, LISTING_PAGE_SIZE, offset)
		.all();

	return new Response(JSON.stringify({ data: listRows.results ?? [], totalCount }), {
		headers: { "content-type": "application/json" },
	});
}

const ADMIN_EMAIL = "souk2109"; // 배치 현황 등 관리자 전용 기능을 볼 수 있는 계정

// 모든 로그인 후 페이지가 공유하는 헤더. 페이지마다 <header>를 복사해두지 않고
// 정적 파일을 서빙하기 직전에 Worker가 <body> 바로 뒤에 끼워 넣는다.
// 헤더를 바꿀 땐 이 한 곳만 수정하면 된다 (로그인 페이지는 이 로직을 타지 않으므로 영향 없음).
function buildSharedHeader(user) {
	const adminLink = user?.email === ADMIN_EMAIL ? `<a href="/admin-batch">배치 현황</a>` : "";
	return `
		<header class="site-header">
			<div class="container header-inner">
				<a href="/" class="brand">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M3 11l9-8 9 8" />
						<path d="M5 10v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10" />
					</svg>
					청약 정보
				</a>
				<nav>
					<a href="/">홈</a>
					<a href="/settings">개인설정</a>
					${adminLink}
					<a href="#" id="logout-link">로그아웃</a>
				</nav>
			</div>
		</header>
`;
}

// PWA 설치(홈 화면 추가)에 필요한 <head> 태그. 로그인 여부와 무관하게 모든 HTML 페이지에 들어간다
// (manifest.json/아이콘/sw.js에는 민감한 정보가 없으므로 비로그인 상태에서도 안전하게 노출 가능).
const HEAD_EXTRA = `
	<link rel="manifest" href="/manifest.json" />
	<link rel="icon" href="/assets/icons/icon-192.png" />
	<link rel="apple-touch-icon" href="/assets/icons/icon-192.png" />
	<meta name="theme-color" content="#2563eb" />
`;

// 정적 자산(CSS/JS/아이콘)만 캐싱하는 서비스 워커 등록 스크립트 (sw.js 참고 - HTML/API는 캐싱하지 않음)
const SW_REGISTER_SCRIPT = `<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");</script>`;

// 로그인 후 페이지에서 공유하는 헤더(nav)와 PWA 관련 <head> 태그를 정적 파일 서빙 직전에 끼워 넣는다.
// user가 없으면(로그인 페이지) nav 없이 PWA 태그만 추가한다.
async function injectPageEnhancements(response, user) {
	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("text/html")) return response;

	let html = await response.text();

	if (html.includes("</head>")) {
		html = html.replace("</head>", `${HEAD_EXTRA}\t</head>`);
	}

	if (html.includes("<body>")) {
		const navHtml = user ? buildSharedHeader(user) : "";
		html = html.replace("<body>", `<body>\n${SW_REGISTER_SCRIPT}${navHtml}`);
	}

	return new Response(html, response);
}

async function handleAdminBatchStatus(user, env) {
	if (user.email !== ADMIN_EMAIL) return jsonError("권한이 없습니다", 403);
	const runs = await env.DB.prepare("SELECT * FROM batch_runs ORDER BY id DESC LIMIT 30").all();
	return new Response(JSON.stringify({ runs: runs.results ?? [] }), {
		headers: { "content-type": "application/json" },
	});
}

async function proxyApi(pathname, url, env) {
	const serviceName = ENDPOINTS[pathname];
	if (!serviceName) return jsonError("Not found", 404);
	if (!env.SERVICE_KEY) return jsonError("SERVICE_KEY is not configured", 500);

	const target = new URL(`${BASE_URL}/${serviceName}`);
	target.search = url.search;
	target.searchParams.set("serviceKey", env.SERVICE_KEY);

	const upstream = await fetch(target, {
		headers: { accept: "application/json" },
	});

	return new Response(upstream.body, {
		status: upstream.status,
		headers: {
			"content-type": upstream.headers.get("content-type") ?? "application/json",
		},
	});
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url;

		if (pathname === "/api/login" && request.method === "POST") {
			return handleLogin(request, env);
		}
		if (pathname === "/api/logout" && request.method === "POST") {
			return handleLogout(request, env);
		}

		const user = await getSessionUser(request, env);

		if (!user) {
			// manifest.json/sw.js는 PWA 설치를 위해 로그인 여부와 무관하게 항상 열어둔다 (민감정보 없음).
			if (pathname === "/login" || pathname === "/manifest.json" || pathname === "/sw.js" || pathname.startsWith("/assets/")) {
				return injectPageEnhancements(await env.ASSETS.fetch(request), null);
			}
			if (pathname.startsWith("/api/")) {
				return jsonError("Unauthorized", 401);
			}
			return Response.redirect(new URL("/login", url).toString(), 302);
		}

		if (pathname === "/login") {
			return Response.redirect(new URL("/", url).toString(), 302);
		}

		if (pathname === "/admin-batch" && user.email !== ADMIN_EMAIL) {
			return Response.redirect(new URL("/", url).toString(), 302);
		}

		if (pathname === "/api/admin/batch-status") {
			if (request.method !== "GET") return jsonError("Method not allowed", 405);
			return handleAdminBatchStatus(user, env);
		}

		if (pathname === "/api/settings") {
			if (request.method === "GET") return excludedAreaHandlers.handleGet(user, env);
			if (request.method === "POST") return excludedAreaHandlers.handleAdd(user, request, env);
			if (request.method === "DELETE") return excludedAreaHandlers.handleDelete(user, request, env);
			return jsonError("Method not allowed", 405);
		}

		if (pathname === "/api/settings/included-areas") {
			if (request.method === "GET") return includedAreaHandlers.handleGet(user, env);
			if (request.method === "POST") return includedAreaHandlers.handleAdd(user, request, env);
			if (request.method === "DELETE") return includedAreaHandlers.handleDelete(user, request, env);
			return jsonError("Method not allowed", 405);
		}

		if (pathname === "/api/settings/cities") {
			if (request.method === "GET") return handleGetCities(user, env);
			if (request.method === "POST") return handleSaveCities(user, request, env);
			return jsonError("Method not allowed", 405);
		}

		for (const config of Object.values(LISTING_TYPES)) {
			if (pathname === config.servicePath) {
				if (request.method !== "GET") return jsonError("Method not allowed", 405);
				return handleListingSearch(user, url, env, config);
			}
		}


		if (pathname.startsWith("/api/")) {
			if (request.method !== "GET") return jsonError("Method not allowed", 405);
			return proxyApi(pathname, url, env);
		}

		return injectPageEnhancements(await env.ASSETS.fetch(request), user);
	},

	async scheduled(event, env, ctx) {
		ctx.waitUntil(
			Promise.allSettled(
				Object.entries(LISTING_TYPES).map(([key, config]) => runListingsBatch(env, key, config)),
			),
		);
	},
};
