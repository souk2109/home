// 조회형 페이지(apt-detail.html, urbty-detail.html 등) 공통 로직.
// 각 페이지는 <script> 블록에서 window.LISTING_CONFIG를 정의한 뒤 이 스크립트를 로드한다.
// LISTING_CONFIG 형태:
// {
//   apiPath: "/api/apt/detail",
//   labels: { FIELD: "한글라벨", ... },       // 상세 펼침에 표시할 전체 필드 라벨
//   summaryKeys: ["HOUSE_NM", ...],           // 카드 요약(접힌 상태)에 노출할 필드 - 상세에서는 제외
//   ynKeys: ["FIELD", ...],                   // Y/N 값을 예/아니오로 표시할 필드
//   highlightYesKeys: ["FIELD", ...],         // (선택) ynKeys 중 값이 "예"일 때 빨간색으로 강조할 필드
//   highlightNoKeys: ["FIELD", ...],          // (선택) ynKeys 중 값이 "아니오"일 때 노란색으로 강조할 필드
//   announceField: "RCRIT_PBLANC_DE",         // 요약 라인의 "모집공고" 날짜 필드
//   acceptStartField: "RCEPT_BGNDE",          // 요약 라인의 "접수" 시작 필드
//   acceptEndField: "RCEPT_ENDDE",            // 요약 라인의 "접수" 종료 필드
//   modelApiPath: "/api/apt/model",           // (선택) 주택형별 상세(*Mdl) 라이브 프록시 경로. 없으면 이 섹션 자체를 생략.
//   modelLabels: { FIELD: "한글라벨", ... },  // 주택형별 상세에 표시할 필드 라벨.
//                                              // API 응답에 전용면적 필드가 없는 엔드포인트(APT/잔여세대/임의공급 Mdl)는
//                                              // 키를 EXCLUSE_AR_FROM_HOUSE_TY_KEY(아래 상수)로 넣으면 HOUSE_TY(예: "058.8500A")
//                                              // 앞부분 숫자를 전용면적(㎡)으로 파싱해 평으로 환산 표시한다.
//   moneyKeys: ["LTTOT_TOP_AMOUNT", ...],     // (선택) 금액 필드 - "만원" 단위 접미사를 붙여 표시
//   areaKeys: ["SUPLY_AR", ...],              // (선택) ㎡ 면적 필드 - "25.41(평)" 형태로 평 환산 표시
//   unitSuffixes: { FIELD: "세대" },          // (선택) 특정 필드에 단순 단위 접미사를 붙여 표시
//   labelHints: { FIELD: "짧은 설명" },       // (선택) 라벨에 마우스를 올리면(title) 보여줄 짧은 설명
//   infoBoxHtml: "<p>...</p>",                // (선택) 페이지 상단에 접히는 안내 박스에 넣을 HTML
//   transitButton: true,                      // (선택) 카드에 "길찾기" 버튼 추가. 개인설정에 등록한 대중교통
//                                              // 목적지까지의 소요시간을 /api/transit-route로 조회한다.
//                                              // 카드를 펼칠 때 자동 로드하지 않고 버튼을 눌렀을 때만 호출한다
//                                              // (TMAP 대중교통 API 무료 한도가 하루 10건뿐이라서).
//   listingTypeKey: "apt",                    // transitButton이 true일 때 필수 - LISTING_TYPES의 키와 동일해야 함
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
	// modelLabels에 이 값을 키로 넣으면 HOUSE_TY(주택형, 예: "058.8500A")의 앞부분 숫자를
	// 전용면적(㎡)으로 파싱해 표시한다. API 응답 자체엔 없는 키이므로 renderModelRows에서 별도 계산.
	const EXCLUSE_AR_FROM_HOUSE_TY_KEY = "__EXCLUSE_AR_FROM_HOUSE_TY__";

	let currentPage = 1;
	let currentHouseName = "";
	let totalCount = 0;

	function formatValue(key, value) {
		if (value === null || value === undefined || value === "") return "-";
		if (config.ynKeys.includes(key)) {
			if (value === "Y") {
				return config.highlightYesKeys?.includes(key) ? '<span class="highlight-danger">예</span>' : "예";
			}
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

	// 1평 = 3.305785㎡. 소수점 2자리에서 반올림하지 않고 버려서 "25.41(평)" 형태로 표시한다.
	function formatArea(value) {
		const num = Number(value);
		if (!Number.isFinite(num)) return String(value);
		const truncate2 = (n) => (Math.trunc(n * 100) / 100).toFixed(2);
		return `${truncate2(num / 3.305785)}(평)`;
	}

	// HOUSE_TY(주택형, 예: "058.8500A")의 앞부분 숫자를 전용면적(㎡)으로 파싱
	function parseAreaFromHouseTy(houseTy) {
		const match = String(houseTy ?? "").match(/^([\d.]+)/);
		return match ? Number(match[1]) : null;
	}

	function formatModelValue(key, value) {
		if (value === null || value === undefined || value === "") return "-";
		if ((config.moneyKeys ?? []).includes(key)) return formatMoneyManwon(value);
		if (key === EXCLUSE_AR_FROM_HOUSE_TY_KEY || (config.areaKeys ?? []).includes(key)) return formatArea(value);
		return String(value);
	}

	// 세대수(...HSHLDCO) 필드가 0(또는 데이터 없음)이면 해당 항목 자체를 표시하지 않는다
	// (예: 특별공급-청년 세대수가 0인 주택형은 "특별공급-청년" 항목을 아예 숨김)
	function isZeroHshldco(key, rawValue) {
		if (!/HSHLDCO$/.test(key)) return false;
		const num = Number(rawValue);
		return Number.isFinite(num) && num === 0;
	}

	function renderModelRows(bodyEl, modelRows) {
		if (modelRows.length === 0) {
			bodyEl.innerHTML = '<p class="model-empty">주택형별 상세 정보가 없습니다.</p>';
			return;
		}
		bodyEl.innerHTML = modelRows
			.map((mrow) => {
				const renderEntry = (key) => {
					const value = key === EXCLUSE_AR_FROM_HOUSE_TY_KEY ? parseAreaFromHouseTy(mrow.HOUSE_TY) : mrow[key];
					return `<div><dt>${config.modelLabels[key]}</dt><dd>${formatModelValue(key, value)}</dd></div>`;
				};
				const keys = Object.keys(config.modelLabels).filter((key) => !isZeroHshldco(key, mrow[key]));
				// 세대수(...HSHLDCO) 필드는 나머지 정보와 구분선을 두고 아래쪽에 모아서 표시
				const infoHtml = keys.filter((key) => !/HSHLDCO$/.test(key)).map(renderEntry).join("");
				const countHtml = keys.filter((key) => /HSHLDCO$/.test(key)).map(renderEntry).join("");
				const divider = countHtml ? '<div class="row-divider"></div>' : "";
				return `<dl class="model-row">${infoHtml}${divider}${countHtml}</dl>`;
			})
			.join("");
	}

	// "길찾기" 버튼: 청약 주소 -> 개인설정에 등록된 대중교통 목적지까지의 요약 정보.
	// 모델 섹션과 달리 카드를 펼칠 때 자동 로드하지 않고, 버튼을 눌렀을 때만 조회한다
	// (TMAP 대중교통 API 무료 한도가 하루 10건뿐이라 불필요한 호출을 막기 위함).
	function formatTransitLeg(leg) {
		const minutes = Math.round((leg.sectionTime ?? 0) / 60);
		if (leg.mode === "WALK") return `🚶 도보 ${minutes}분 (${leg.distance ?? 0}m)`;
		const icon = leg.mode === "SUBWAY" ? "🚇" : leg.mode === "BUS" ? "🚌" : "🚏";
		const routeName = leg.route ?? leg.mode;
		return `${icon} ${routeName}: ${leg.start?.name ?? ""} → ${leg.end?.name ?? ""} (${minutes}분)`;
	}

	// 목적지 하나당 보여줄 경로 카테고리 3종(이 순서로 표시).
	const ROUTE_CATEGORIES = [
		{ key: "subway", label: "지하철" },
		{ key: "fastest", label: "최단시간" },
		{ key: "fewestTransfers", label: "최소환승" },
	];

	// 상세 경로(legs)는 handleTransitRoute가 최초 조회 시 이미 D1에 저장해둔 후보 전체 중에서
	// 골라 읽기만 하므로 Tmap을 다시 호출하지 않는다.
	async function loadTransitDetail(optionEl, row, destKey, category) {
		const detailEl = optionEl.closest(".transit-option-wrap").querySelector(".transit-detail");
		if (detailEl.dataset.loaded === "true") {
			detailEl.hidden = !detailEl.hidden;
			return;
		}
		detailEl.hidden = false;
		detailEl.innerHTML = '<p class="transit-loading">불러오는 중...</p>';
		try {
			const params = new URLSearchParams();
			params.set("listingType", config.listingTypeKey);
			params.set("houseManageNo", row.HOUSE_MANAGE_NO);
			params.set("pblancNo", row.PBLANC_NO);
			params.set("destKey", destKey);
			params.set("category", category);

			const res = await fetch(`/api/transit-route/detail?${params.toString()}`);
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || `상세 경로 조회 실패 (${res.status})`);
			detailEl.innerHTML = (body.legs ?? []).map((leg) => `<div class="transit-leg">${formatTransitLeg(leg)}</div>`).join("");
			detailEl.dataset.loaded = "true";
		} catch (err) {
			detailEl.innerHTML = `<p class="transit-error">상세 경로를 불러오지 못했습니다: ${err.message}</p>`;
		}
	}

	function renderTransitResults(bodyEl, results, row) {
		if (results.length === 0) {
			bodyEl.innerHTML = '<p class="transit-empty">개인설정에서 대중교통 목적지를 먼저 등록하세요. <a href="/settings">개인설정으로 이동</a></p>';
			return;
		}
		bodyEl.innerHTML = results
			.map((r) => {
				if (r.error) {
					return `
						<div class="transit-item">
							<div class="transit-dest-title">${r.label}</div>
							<div class="transit-option"><span class="transit-error">${r.error}</span></div>
						</div>
					`;
				}
				const optionsHtml = ROUTE_CATEGORIES.map(({ key, label }) => {
					const opt = r.routes?.[key];
					if (!opt) {
						return `
							<div class="transit-option-wrap">
								<div class="transit-option transit-option-disabled">
									<span class="transit-option-label">${label}</span><span>해당 경로 없음</span>
								</div>
							</div>
						`;
					}
					const fare = typeof opt.fare === "number" ? `${opt.fare.toLocaleString()}원` : "-";
					return `
						<div class="transit-option-wrap">
							<div class="transit-option transit-option-clickable" data-category="${key}" data-dest-key="${r.destKey}" role="button" tabindex="0">
								<span class="transit-option-label">${label}</span>
								<span>${opt.totalTimeMin}분 · 환승 ${opt.transferCount ?? 0}회 · ${fare}</span>
							</div>
							<div class="transit-detail" hidden></div>
						</div>
					`;
				}).join("");

				return `
					<div class="transit-item">
						<div class="transit-dest-title">${r.label}</div>
						${optionsHtml}
					</div>
				`;
			})
			.join("");

		bodyEl.querySelectorAll(".transit-option-clickable").forEach((optionEl) => {
			optionEl.addEventListener("click", () => loadTransitDetail(optionEl, row, optionEl.dataset.destKey, optionEl.dataset.category));
		});
	}

	async function loadTransitSection(btn, row) {
		const bodyEl = btn.nextElementSibling;
		btn.disabled = true;
		btn.textContent = "조회 중...";
		try {
			const params = new URLSearchParams();
			params.set("listingType", config.listingTypeKey);
			params.set("houseManageNo", row.HOUSE_MANAGE_NO);
			params.set("pblancNo", row.PBLANC_NO);
			params.set("address", row.HSSPLY_ADRES ?? "");

			const res = await fetch(`/api/transit-route?${params.toString()}`);
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || `길찾기 조회 실패 (${res.status})`);
			renderTransitResults(bodyEl, body.results ?? [], row);
			btn.textContent = "다시 조회";
		} catch (err) {
			bodyEl.innerHTML = `<p class="transit-error">길찾기 조회 실패: ${err.message}</p>`;
			btn.textContent = "길찾기";
		} finally {
			btn.disabled = false;
		}
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

	// "OO시작일"/"OO종료일" 라벨 쌍을 한 항목("OO: 시작값 ~ 종료값")으로 합쳐서 표시한다.
	// (예: "특별공급 접수시작일"+"특별공급 접수종료일" -> "특별공급 접수: 2022-05-23 ~ 2022-05-23")
	function findDateRangeEndKey(detailKeys, consumed, startLabel) {
		if (!startLabel.endsWith("시작일")) return null;
		const endLabel = `${startLabel.slice(0, -3)}종료일`;
		return detailKeys.find((k) => !consumed.has(k) && config.labels[k] === endLabel) ?? null;
	}

	function renderCards(rows) {
		if (rows.length === 0) {
			resultEl.innerHTML = '<div class="empty-state">조회된 결과가 없습니다.</div>';
			return;
		}

		const detailKeys = Object.keys(config.labels).filter((key) => !config.summaryKeys.includes(key));

		resultEl.innerHTML = rows
			.map((row) => {
				const consumed = new Set();
				// 정보 -> (구분선) -> 접수기간 -> (구분선) -> 당첨자발표일/계약기간, 3단으로 나눠서 표시
				const infoEntries = [];
				const rcptRangeEntries = [];
				const laterEntries = [];
				detailKeys.forEach((key) => {
					if (consumed.has(key)) return;
					const label = config.labels[key];
					const hint = config.labelHints?.[key];
					const dtAttr = hint ? ` title="${hint.replace(/"/g, "&quot;")}"` : "";
					const endKey = findDateRangeEndKey(detailKeys, consumed, label);
					if (endKey) {
						consumed.add(endKey);
						const rangeLabel = label.slice(0, -3);
						const startVal = formatValue(key, row[key]);
						const endVal = formatValue(endKey, row[endKey]);
						const rangeVal = startVal === "-" && endVal === "-" ? "-" : `${startVal} ~ ${endVal}`;
						const entryHtml = `<div><dt${dtAttr}>${rangeLabel}</dt><dd>${rangeVal}</dd></div>`;
						(rangeLabel.includes("접수") ? rcptRangeEntries : laterEntries).push(entryHtml);
						return;
					}
					const entryHtml = `<div><dt${dtAttr}>${label}</dt><dd>${formatValue(key, row[key])}</dd></div>`;
					(key === "PRZWNER_PRESNATN_DE" ? laterEntries : infoEntries).push(entryHtml);
				});
				const divider1 = rcptRangeEntries.length ? '<div class="row-divider"></div>' : "";
				const divider2 = laterEntries.length ? '<div class="row-divider"></div>' : "";
				const detailEntries =
					infoEntries.join("") + divider1 + rcptRangeEntries.join("") + divider2 + laterEntries.join("");

				const meta = `모집공고 ${row[config.announceField] ?? "-"} · 접수 ${row[config.acceptStartField] ?? "-"} ~ ${row[config.acceptEndField] ?? "-"}`;

				const modelSection = config.modelApiPath
					? `
						<div class="model-section">
							<h3 class="model-title">주택형별 상세</h3>
							<div class="model-body"><p class="model-loading">펼치면 불러옵니다...</p></div>
						</div>
					`
					: "";

				const transitSection = config.transitButton
					? `
						<div class="transit-section">
							<button type="button" class="transit-btn">길찾기</button>
							<div class="transit-body"></div>
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
						${transitSection}
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

		if (config.transitButton) {
			document.querySelectorAll(".card").forEach((card, i) => {
				const btn = card.querySelector(".transit-btn");
				if (btn) btn.addEventListener("click", () => loadTransitSection(btn, rows[i]));
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
