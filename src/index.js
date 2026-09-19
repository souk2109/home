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
			if (pathname === "/login" || pathname.startsWith("/assets/")) {
				return env.ASSETS.fetch(request);
			}
			if (pathname.startsWith("/api/")) {
				return jsonError("Unauthorized", 401);
			}
			return Response.redirect(new URL("/login", url).toString(), 302);
		}

		if (pathname === "/login") {
			return Response.redirect(new URL("/", url).toString(), 302);
		}

		if (pathname.startsWith("/api/")) {
			if (request.method !== "GET") return jsonError("Method not allowed", 405);
			return proxyApi(pathname, url, env);
		}

		return env.ASSETS.fetch(request);
	},
};
