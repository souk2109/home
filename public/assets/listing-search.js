// 조회형 페이지(apt-detail.html, urbty-detail.html 등) 공통 로직.
// 각 페이지는 <script> 블록에서 window.LISTING_CONFIG를 정의한 뒤 이 스크립트를 로드한다.
// LISTING_CONFIG 형태:
// {
//   apiPath: "/api/apt/detail",
//   labels: { FIELD: "한글라벨", ... },       // 상세 펼침에 표시할 전체 필드 라벨
//   summaryKeys: ["HOUSE_NM", ...],           // 카드 요약(접힌 상태)에 노출할 필드 - 상세에서는 제외
//   ynKeys: ["FIELD", ...],                   // Y/N 값을 예/아니오로 표시할 필드
//   announceField: "RCRIT_PBLANC_DE",         // 요약 라인의 "모집공고" 날짜 필드
//   acceptStartField: "RCEPT_BGNDE",          // 요약 라인의 "접수" 시작 필드
//   acceptEndField: "RCEPT_ENDDE",            // 요약 라인의 "접수" 종료 필드
//   modelApiPath: "/api/apt/model",           // (선택) 주택형별 상세(*Mdl) 라이브 프록시 경로. 없으면 이 섹션 자체를 생략.
//   modelLabels: { FIELD: "한글라벨", ... },  // 주택형별 상세에 표시할 필드 라벨
//   moneyKeys: ["LTTOT_TOP_AMOUNT", ...],     // (선택) 금액 필드 - "만원" 단위 접미사를 붙여 표시
//   unitSuffixes: { FIELD: "세대" },          // (선택) 특정 필드에 단순 단위 접미사를 붙여 표시
//   labelHints: { FIELD: "짧은 설명" },       // (선택) 라벨에 마우스를 올리면(title) 보여줄 짧은 설명
//   infoBoxHtml: "<p>...</p>",                // (선택) 페이지 상단에 접히는 안내 박스에 넣을 HTML
// }
(function () {
	const config = window.LISTING_CONFIG;
	if (!config) {
		console.error("listing-search.js: window.LISTING_CONFIG가 정의되지 않았습니다.");
		return;
	}

	const form = document.getElementById("search-form");
	const statusEl = document.getElementById("status");
	const resultEl = document.getElementById("result");
	const paginationEl = document.getElementById("pagination");

	const PAGE_SIZE = 15;
	const LINK_KEYS = new Set(["PBLANC_URL", "HMPG_ADRES"]);

	let currentPage = 1;
	let currentHouseName = "";
	let totalCount = 0;

	function formatValue(key, value) {
		if (value === null || value === undefined || value === "") return "-";
		if (config.ynKeys.includes(key)) {
			if (value === "Y") return "예";
			return config.highlightNoKeys?.includes(key) ? '<span class="highlight">아니오</span>' : "아니오";
		}
		if (LINK_KEYS.has(key)) {
			const safeHref = String(value).replace(/"/g, "&quot;");
			return `<a href="${safeHref}" target="_blank" rel="noopener">바로가기</a>`;
		}
		if (key === "MVN_PREARNGE_YM") {
			const s = String(value);
			if (/^\d{6}$/.test(s)) return `${s.slice(0, 4)}년 ${parseInt(s.slice(4, 6), 10)}월`;
			return s;
		}
		const unit = config.unitSuffixes?.[key];
		if (unit) {
			// 일부 엔드포인트(오피스텔 등)는 세대수를 "14.0" 같은 소수점 문자열로 내려줌 - 정수로 정리해서 표시
			const num = Number(value);
			const display = Number.isFinite(num) ? Math.round(num) : value;
			return `${display}${unit}`;
		}
		return String(value);
	}

	function extractCityDistrict(address) {
		if (!address) return "-";
		const parts = String(address).split(" ");
		return parts.length > 1 ? parts[1] : "-";
	}

	// 만원 단위 숫자를 "N억 M만원" 형태로 표시 (예: 86400 -> "8억 6400만원")
	function formatMoneyManwon(value) {
		const num = Number(String(value).replace(/,/g, ""));
		if (!Number.isFinite(num)) return String(value);
		const eok = Math.floor(num / 10000);
		const man = num % 10000;
		if (eok > 0 && man > 0) return `${eok}억 ${man}만원`;
		if (eok > 0) return `${eok}억원`;
		return `${man}만원`;
	}

	function formatModelValue(key, value) {
		if (value === null || value === undefined || value === "") return "-";
		if ((config.moneyKeys ?? []).includes(key)) return formatMoneyManwon(value);
		return String(value);
	}

	function renderModelRows(bodyEl, modelRows) {
		if (modelRows.length === 0) {
			bodyEl.innerHTML = '<p class="model-empty">주택형별 상세 정보가 없습니다.</p>';
			return;
		}
		bodyEl.innerHTML = modelRows
			.map((mrow) => {
				const entries = Object.keys(config.modelLabels)
					.map((key) => `<div><dt>${config.modelLabels[key]}</dt><dd>${formatModelValue(key, mrow[key])}</dd></div>`)
					.join("");
				return `<dl class="model-row">${entries}</dl>`;
			})
			.join("");
	}

	async function loadModelSection(section, row) {
		if (section.dataset.loaded === "true") return;
		section.dataset.loaded = "true";

		const bodyEl = section.querySelector(".model-body");
		try {
			const params = new URLSearchParams();
			params.set("cond[HOUSE_MANAGE_NO::EQ]", row.HOUSE_MANAGE_NO);
			params.set("cond[PBLANC_NO::EQ]", row.PBLANC_NO);
			params.set("page", "1");
			params.set("perPage", "50");

			const res = await fetch(`${config.modelApiPath}?${params.toString()}`);
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || `주택형별 상세 조회 실패 (${res.status})`);
			renderModelRows(bodyEl, body.data ?? []);
		} catch (err) {
			bodyEl.innerHTML = `<p class="model-error">주택형별 상세를 불러오지 못했습니다: ${err.message}</p>`;
		}
	}

	function renderCards(rows) {
		if (rows.length === 0) {
			resultEl.innerHTML = '<div class="empty-state">조회된 결과가 없습니다.</div>';
			return;
		}

		resultEl.innerHTML = rows
			.map((row) => {
				const detailEntries = Object.keys(config.labels)
					.filter((key) => !config.summaryKeys.includes(key))
					.map((key) => {
						const hint = config.labelHints?.[key];
						const dtAttr = hint ? ` title="${hint.replace(/"/g, "&quot;")}"` : "";
						return `<div><dt${dtAttr}>${config.labels[key]}</dt><dd>${formatValue(key, row[key])}</dd></div>`;
					})
					.join("");

				const meta = `모집공고 ${row[config.announceField] ?? "-"} · 접수 ${row[config.acceptStartField] ?? "-"} ~ ${row[config.acceptEndField] ?? "-"}`;

				const modelSection = config.modelApiPath
					? `
						<div class="model-section">
							<h3 class="model-title">주택형별 상세</h3>
							<div class="model-body"><p class="model-loading">펼치면 불러옵니다...</p></div>
						</div>
					`
					: "";

				return `
					<details class="card">
						<summary>
							<span class="name">${row.HOUSE_NM ?? "-"}</span>
							<span class="region">${row.SUBSCRPT_AREA_CODE_NM ?? "-"}</span>
							<span class="region">${extractCityDistrict(row.HSSPLY_ADRES)}</span>
							<span class="meta">${meta}</span>
						</summary>
						<dl class="card-detail">${detailEntries}</dl>
						${modelSection}
					</details>
				`;
			})
			.join("");

		if (config.modelApiPath) {
			document.querySelectorAll(".card").forEach((card, i) => {
				card.addEventListener("toggle", () => {
					if (!card.open) return;
					const section = card.querySelector(".model-section");
					if (section) loadModelSection(section, rows[i]);
				});
			});
		}
	}

	function renderPagination() {
		if (totalCount === 0) {
			paginationEl.innerHTML = "";
			return;
		}
		const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
		paginationEl.innerHTML = `
			<button type="button" id="prev-page" ${currentPage <= 1 ? "disabled" : ""}>이전</button>
			<span>${currentPage} / ${totalPages} 페이지</span>
			<button type="button" id="next-page" ${currentPage >= totalPages ? "disabled" : ""}>다음</button>
		`;

		document.getElementById("prev-page")?.addEventListener("click", () => loadPage(currentPage - 1));
		document.getElementById("next-page")?.addEventListener("click", () => loadPage(currentPage + 1));
	}

	async function fetchPage(page) {
		const params = new URLSearchParams();
		if (currentHouseName) params.set("houseName", currentHouseName);
		params.set("page", String(page));

		const res = await fetch(`${config.apiPath}?${params.toString()}`);
		const body = await res.json();
		if (!res.ok) throw new Error(body.error || `조회 실패 (${res.status})`);
		return body;
	}

	async function loadPage(page) {
		statusEl.textContent = "조회 중...";
		statusEl.className = "";
		try {
			const body = await fetchPage(page);
			currentPage = page;
			totalCount = body.totalCount ?? 0;
			renderCards(body.data ?? []);
			statusEl.textContent = `조건에 맞는 ${totalCount}건`;
			renderPagination();
		} catch (err) {
			statusEl.textContent = `오류: ${err.message}`;
			statusEl.className = "error";
		}
	}

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		currentHouseName = new FormData(form).get("houseName")?.trim() || "";
		loadPage(1);
	});

	if (config.infoBoxHtml) {
		const infoBoxEl = document.getElementById("info-box");
		if (infoBoxEl) {
			infoBoxEl.innerHTML = `
				<details class="info-box">
					<summary>❓ 접수 순서/용어가 궁금하다면</summary>
					<div class="info-body">${config.infoBoxHtml}</div>
				</details>
			`;
		}
	}

	loadPage(1); // 페이지 진입 시 바로 조회
})();
