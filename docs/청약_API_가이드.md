# 청약홈 분양정보 조회 서비스 — Open API 활용가이드

> 원본 문서: `기술문서_청약홈_분양정보_조회_서비스_260129.docx` 를 정리한 요약 자료입니다.

## 목차
1. [API 서비스 개요](#api-서비스-개요)
2. [코드명세](#코드명세)
3. [상세기능 목록 (10개 엔드포인트)](#상세기능-목록)
4. [상세기능내역 (엔드포인트별 요청/응답 명세)](#상세기능내역)
5. [OpenAPI 에러 코드정리](#openapi-에러-코드정리)

---

## 1. 서비스 명세

### API 서비스 개요

| 항목 | 내용 |
|---|---|
| API명(영문) | ApplyhomeInfoDetailSvc |
| API명(국문) | 청약홈 분양정보 조회 서비스 |
| API 설명 | 청약홈 분양정보를 조회할 수 있는 서비스로 APT(민간사전청약 및 신혼희망타운 포함), 오피스텔/도시형/민간임대/생활숙박시설, APT 잔여세대, 공공지원 민간임대, 임의공급 별로 분양정보 및 주택형별 분양정보를 확인할 수 있다. |
| 서비스 인증/권한 | ServiceKey 방식 (인증서/Basic 인증 아님) |
| 메시지 레벨 암호화 | 없음 |
| 전송 레벨 암호화 | 없음 (SSL 미적용) |
| 인터페이스 표준 | **REST (GET)** |
| 교환 데이터 표준 | XML, JSON (중복 선택 가능 — 실제 응답은 JSON) |
| 서비스 URL 패턴 | `https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/{상세서비스명}?page=1&perPage=10&serviceKey={서비스키}` |
| 서비스 명세 URL | https://infuser.odcloud.kr/api/stages/37000/api-docs?165458057581 |
| 서비스 버전 | 1.0 |
| 서비스 시작일 / 배포일 | 2022-01-24 |
| 서비스 이력 | 2022-01 서비스 오픈 |
| 메시지 교환유형 | Request-Response |
| 서비스 제공자 | 한국부동산원 ICT센터 ICT전략부 / 053-663-8466 |
| 데이터 갱신주기 | 매일 |

> **웹(브라우저/JS)에서 통신 시 참고**
> - REST GET 방식이므로 `fetch`나 `axios`의 GET 요청으로 바로 호출 가능
> - 인증은 별도 헤더 없이 쿼리스트링의 `serviceKey` 파라미터로 처리
> - 브라우저에서 직접 호출 시 CORS 정책을 확인 필요 (막혀 있으면 프록시 서버 경유 필요)
> - 검색 조건은 `cond[필드명::연산자]=값` 형태로 URL 인코딩해서 전달 (예: `cond[HOUSE_MANAGE_NO::EQ]=2022000248`)

### 코드명세

#### 공급지역 코드

| 순번 | 지역구분 | 코드(SUBSCRPT_AREA_CODE) |
|---|---|---|
| 1 | 서울 | 100 |
| 2 | 강원 | 200 |
| 3 | 대전 | 300 |
| 4 | 충남 | 312 |
| 5 | 세종 | 338 |
| 6 | 충북 | 360 |
| 7 | 인천 | 400 |
| 8 | 경기 | 410 |
| 9 | 광주 | 500 |
| 10 | 전남 | 513 |
| 11 | 전북 | 560 |
| 12 | 부산 | 600 |
| 13 | 경남 | 621 |
| 14 | 울산 | 680 |
| 15 | 제주 | 690 |
| 16 | 대구 | 700 |
| 17 | 경북 | 712 |

※ 전국 또는 광역권(ex. (서울, 경기, 인천), (대구, 경북) 등) 인 경우 지역코드 값이 존재하지 않습니다.

#### 주택구분 코드(APT)

| 순번 | 주택구분 | 코드(HOUSE_SECD) |
|---|---|---|
| 1 | APT | 01 |
| 2 | 민간사전청약 | 09 |
| 3 | 신혼희망타운 | 10 |

#### 주택상세구분 코드(APT)

| 순번 | 주택상세구분 | 코드(HOUSE_DTL_SECD) |
|---|---|---|
| 1 | 민영 | 01 |
| 2 | 국민 | 03 |

#### 분양구분 코드 (APT)

| 순번 | 층별구분 | 코드(RENT_SECD) |
|---|---|---|
| 1 | 분양주택 | 0 |
| 2 | 분양전환 가능임대 | 1 |

#### 조정대상지역 코드 (APT)

| 순번 | 층별구분 | 코드(MDAT_TRGET_AREA_SECD) |
|---|---|---|
| 1 | 과열지역 | Y |
| 2 | 미대상주택 | N |

#### 주택상세구분 코드(오피스텔/도시형/생활숙박시설/민간임대, 검색조건에 사용)

| 순번 | 주택구분 | 코드 |
|---|---|---|
| 1 | 도시형생활주택 | 0201 |
| 2 | 오피스텔 | 0202 |
| 3 | 민간임대 | 0203 |
| 4 | 생활형숙박시설 | 0204 |

#### 주택구분 코드(잔여세대)

| 순번 | 층별구분 | 코드 |
|---|---|---|
| 1 | 무순위 | 04 |
| 2 | 불법행위 재공급 | 06 |

---

## 2. 상세기능 목록

전체 10개 엔드포인트는 아래 공통 서비스 URL 패턴을 공유합니다:

```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/{상세기능명(영문)}?page=1&perPage=10&serviceKey={서비스키}
```

| 번호 | API명(국문) | 상세기능명(영문) | 상세기능명(국문) |
|---|---|---|---|
| 1 | 청약홈 분양정보 조회 서비스 | getAPTLttotPblancDetail | APT 분양정보 상세조회 |
| 2 | 청약홈 분양정보 조회 서비스 | getUrbtyOfctlLttotPblancDetail | 오피스텔/도시형/민간임대/생활숙박시설 분양정보 상세조회 |
| 3 | 청약홈 분양정보 조회 서비스 | getRemndrLttotPblancDetail | APT 잔여세대 분양정보 상세조회 |
| 4 | 청약홈 분양정보 조회 서비스 | getAPTLttotPblancMdl | APT 분양정보 주택형별 상세조회 |
| 5 | 청약홈 분양정보 조회 서비스 | getUrbtyOfctlLttotPblancMdl | 오피스텔/도시형/민간임대/생활숙박시설 분양정보 주택형별 상세조회 |
| 6 | 청약홈 분양정보 조회 서비스 | getRemndrLttotPblancMdl | APT 잔여세대 주택형별 상세조회 |
| 7 | 청약홈 분양정보 조회 서비스 | getPblPvtRentLttotPblancDetail | 공공지원 민간임대 분양정보 상세조회 |
| 8 | 청약홈 분양정보 조회 서비스 | getPblPvtRentLttotPblancMdl | 공공지원 민간임대 분양정보 주택형별 상세조회 |
| 9 | 청약홈 분양정보 조회 서비스 | getOPTLttotPblancDetail | 임의공급 분양정보 상세조회 |
| 10 | 청약홈 분양정보 조회 서비스 | getOPTLttotPblancMdl | 임의공급 분양정보 주택형별 상세조회 |

---

## 3. 상세기능내역

각 엔드포인트별 요청/응답 항목 명세와 예제입니다. 요청 파라미터는 `cond[항목명(대문자)::연산자]=값` 형식으로 쿼리스트링에 담아 전달합니다 (연산자: `EQ` 일치, `LIKE` 포함검색, `LT`/`LTE`/`GT`/`GTE` 날짜 비교).

### 3.1 APT 분양정보 상세조회 (`getAPTLttotPblancDetail`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 1 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | APT 분양정보 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호, 공급지역명, 모집공고일 값을 이용하여 APT분양정보의 상세정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2022000248 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2022000248 | (Equal) 공고번호 |
| house_nm | 주택명 | 200 | 0 | (LIKE) | 주택명 |
| house_secd | 주택구분코드 | 2 | 0 | (EQ) 01 | (Equal) 주택구분코드 |
| house_dtl_secd | 주택상세구분코드 | 2 | 0 | (EQ) 01 | (Equal) 주택상세구분코드 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | (EQ) 100 | (Equal) 공급지역코드 |
| subscrpt_area_code_nm | 공급지역명 | 500 | 0 | (EQ) 서울 | (Equal) 공급지역명 |
| hssply_adres | 공급위치 | 256 | 0 | (LIKE) | 공급위치 |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (LT) | (Little)                  < ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (LTE) <br>2022-05-31 | (Little or Equal)         <= ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (GT) | (Greater)                  > ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (GTE) <br>2022-01-01 | (Greater or Equal)         >= ‘YYYY-MM-DD’ |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 1 | 2022000248 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 1 | 2022000248 | 공고번호 |
| house_nm | 주택명 | 200 | 0 | 창동 다우아트리체 주상복합 아파트 | 주택명 |
| house_secd | 주택구분코드 | 2 | 0 | 01 | 주택구분코드 |
| house_secd_nm | 주택구분코드명 | 4000 | 0 | APT | 주택구분코드명 |
| house_dtl_secd | 주택상세구분코드 | 2 | 0 | 01 | 주택상세구분코드 |
| house_dtl_secd_nm | 주택상세구분코드명 | 4000 | 0 | 민영 | 주택상세구분코드명 |
| rent_secd | 분양구분코드 | 1 | 0 | 0 | 분양구분코드 |
| rent_secd_nm | 분양구분코드명 | 500 | 0 | 분양주택 | 분양구분코드명 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | 100 | 공급지역코드 |
| subscrpt_area_code_nm | 공급지역명 | 500 | 0 | 서울 | 공급지역명 |
| hssply_zip | 공급위치 우편번호 | 6 | 0 | 01400 | 공급위치 우편번호 |
| hssply_adres | 공급위치 | 256 | 0 | 서울특별시 도봉구 창동 662-7번지 외 12필지 | 공급위치 |
| tot_suply_hshldco | 공급규모 | 10 | 0 | 89 | 공급규모 |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | 2022-05-12 | 모집공고일 |
| nsprc_nm | 신문사 | 200 | 0 | e대한경제 | 신문사 |
| rcept_bgnde | 청약접수시작일 | 10 | 0 | 2022-05-23 | 청약접수시작일 |
| rcept_endde | 청약접수종료일 | 10 | 0 | 2022-05-26 | 청약접수종료일 |
| spsply_rcept_bgnde | 특별공급 접수시작일 | 10 | 0 | 2022-05-23 | 특별공급 접수시작일 |
| spsply_rcept_endde | 특별공급 접수종료일 | 10 | 0 | 2022-05-23 | 특별공급 접수종료일 |
| gnrl_rnk1_crsparea_rcptde | 1순위 해당지역 접수시작일 | 21 | 0 | 2022-05-24 | 1순위 해당지역 접수시작일 |
| gnrl_rnk1_crsparea_endde | 1순위 해당지역 접수종료일 | 21 | 0 | 2022-05-24 | 1순위 해당지역 접수종료일 |
| gnrl_rnk1_etc_gg_rcptde | 1순위 경기지역 접수시작일 | 21 | 0 | - | 1순위 경기지역 접수시작일 |
| gnrl_rnk1_etc_gg_endde | 1순위 경기지역 접수종료일 | 21 | 0 | - | 1순위 경기지역 접수종료일 |
| gnrl_rnk1_etc_area_rcptde | 1순위 기타지역 접수시작일 | 21 | 0 | 2022-05-25 | 1순위 기타지역 접수시작일 |
| gnrl_rnk1_etc_area_endde | 1순위 기타지역 접수종료일 | 21 | 0 | 2022-05-25 | 1순위 기타지역 접수종료일 |
| gnrl_rnk2_crsparea_rcptde | 2순위 해당지역 접수시작일 | 21 | 0 | 2022-05-26 | 2순위 해당지역 접수시작일 |
| gnrl_rnk2_crsparea_endde | 2순위 해당지역 접수종료일 | 21 | 0 | 2022-05-26 | 2순위 해당지역 접수종료일 |
| gnrl_rnk2_etc_gg_rcptde | 2순위 경기지역 접수시작일 | 21 | 0 | - | 2순위 경기지역 접수시작일 |
| gnrl_rnk2_etc_gg_endde | 2순위 경기지역 접수종료일 | 21 | 0 | - | 2순위 경기지역 접수종료일 |
| gnrl_rnk2_etc_area_rcptde | 2순위 기타지역 접수시작일 | 21 | 0 | 2022-05-26 | 2순위 기타지역 접수시작일 |
| gnrl_rnk2_etc_area_endde | 2순위 기타지역 접수종료일 | 21 | 0 | 2022-05-26 | 2순위 기타지역 접수종료일 |
| przwner_presnatn_de | 당첨자발표일 | 10 | 0 | 2022-06-02 | 당첨자발표일 |
| cntrct_cncls_bgnde | 계약시작일 | 10 | 0 | 2022-06-13 | 계약시작일 |
| cntrct_cncls_endde | 계약종료일 | 10 | 0 | 2022-06-15 | 계약종료일 |
| hmpg_adres | 홈페이지주소 | 256 | 0 | http://www.dawartriche.com/ | 홈페이지주소 |
| cnstrct_entrps_nm | 건설업체명 (시공사) | 200 | 0 | 강산건설㈜ | 건설업체명 (시공사) |
| mdhs_telno | 문의처 | 30 | 0 | 16684888 | 문의처 |
| bsns_mby_nm | 사업주체명 (시행사) | 200 | 0 | 주식회사 하나자산신탁 | 사업주체명 (시행사) |
| mvn_prearnge_ym | 입주예정월 | 6 | 0 | 202502 | 입주예정월 |
| speclt_rdn_earth_at | 투기과열지구 | 1 | 0 | Y | 투기과열지구 |
| mdat_trget_area_secd | 조정대상지역 | 1 | 0 | Y | 조정대상지역 |
| parcprc_uls_at | 분양가상한제 | 1 | 0 | N | 분양가상한제 |
| imprmn_bsns_at | 정비사업 | 1 | 0 | N | 정비사업 |
| public_house_earth_at | 공공주택지구 | 1 | 0 | N | 공공주택지구 |
| lrscl_bldlnd_at | 대규모 택지개발지구 | 1 | 0 | N | 대규모 택지개발지구 |
| npln_prvopr_public_house_at | 수도권 내 민영 공공주택지구 | 1 | 0 | N | 수도권 내 민영 공공주택지구 |
| public_house_spclm_applc_apt | 공공주택 특별법 적용 여부 | 1 | 0 | N | 공공주택 특별법 적용 여부 |
| pblanc_url | 모집공고 상세 URL | 300 | 0 | https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=2022000248&pblancNo=2022000248 | 청약홈 분양정보 페이지 연결 URL |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail?page=1&perPage=10&cond%5BHOUSE_MANAGE_NO%3A%3AEQ%5D=2022000248&cond%5BPBLANC_NO%3A%3AEQ%5D=2022000248&cond%5BHOUSE_SECD%3A%3AEQ%5D=01&cond%5BSUBSCRPT_AREA_CODE_NM%3A%3AEQ%5D=%EC%84%9C%EC%9A%B8&cond%5BRCRIT_PBLANC_DE%3A%3ALTE%5D=2022-05-31&cond%5BRCRIT_PBLANC_DE%3A%3AGTE%5D=2022-01-01&serviceKey= 서비스키
```

**응답 예시:**
```json
{
  "currentCount": 1,
  "data": [
    {
      "BSNS_MBY_NM": "주식회사 하나자산신탁",
      "CNSTRCT_ENTRPS_NM": "강산건설(주)",
      "CNTRCT_CNCLS_BGNDE": "2022-06-13",
      "CNTRCT_CNCLS_ENDDE": "2022-06-15",
      "GNRL_RNK1_CRSPAREA_ENDDE": "2022-05-24",
      "GNRL_RNK1_CRSPAREA_RCPTDE": "2022-05-24",
      "GNRL_RNK1_ETC_AREA_ENDDE": "2022-05-25",
      "GNRL_RNK1_ETC_AREA_RCPTDE": "2022-05-25",
      "GNRL_RNK1_ETC_GG_ENDDE": null,
      "GNRL_RNK1_ETC_GG_RCPTDE": null,
      "GNRL_RNK2_CRSPAREA_ENDDE": "2022-05-26",
      "GNRL_RNK2_CRSPAREA_RCPTDE": "2022-05-26",
      "GNRL_RNK2_ETC_AREA_ENDDE": "2022-05-26",
      "GNRL_RNK2_ETC_AREA_RCPTDE": "2022-05-26",
      "GNRL_RNK2_ETC_GG_ENDDE": null,
      "GNRL_RNK2_ETC_GG_RCPTDE": null,
      "HMPG_ADRES": "http://www.dawartriche.com/",
      "HOUSE_DTL_SECD": "01",
      "HOUSE_DTL_SECD_NM": "민영",
      "HOUSE_MANAGE_NO": "2022000248",
      "HOUSE_NM": "창동 다우아트리체 주상복합 아파트",
      "HOUSE_SECD": "01",
      "HOUSE_SECD_NM": "APT",
      "HSSPLY_ADRES": "서울특별시 도봉구 창동 662-7번지 외 12필지",
      "HSSPLY_ZIP": "01400",
      "IMPRMN_BSNS_AT": "N",
      "LRSCL_BLDLND_AT": "N",
      "MDAT_TRGET_AREA_SECD": "Y",
      "MDHS_TELNO": "16684888",
      "MVN_PREARNGE_YM": "202502",
      "NPLN_PRVOPR_PUBLIC_HOUSE_AT": "N",
"NSPRC_NM": "e대한경제",
      "PARCPRC_ULS_AT": "N",
      "PBLANC_NO": "2022000248",
      "PBLANC_URL": "https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancDetail.do?houseManageNo=2022000248&pblancNo=2022000248",
      "PRZWNER_PRESNATN_DE": "2022-06-02",
      "PUBLIC_HOUSE_EARTH_AT": "N",
      "RCEPT_BGNDE": "2022-05-23",
      "RCEPT_ENDDE": "2022-05-26",
      "RCRIT_PBLANC_DE": "2022-05-12",
      "RENT_SECD": "0",
      "RENT_SECD_NM": "분양주택",
      "SPECLT_RDN_EARTH_AT": "Y",
      "SPSPLY_RCEPT_BGNDE": "2022-05-23",
      "SPSPLY_RCEPT_ENDDE": "2022-05-23",
      "SUBSCRPT_AREA_CODE": "100",
      "SUBSCRPT_AREA_CODE_NM": "서울",
      "TOT_SUPLY_HSHLDCO": 89
    }
  ],
  "matchCount": 1,
  "page": 1,
  "perPage": 10,
  "totalCount": 1863
}
```

### 3.2 오피스텔/도시형/민간임대/생활숙박시설 분양정보 상세조회 (`getUrbtyOfctlLttotPblancDetail`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 2 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | 오피스텔/도시형/민간임대 분양정보 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호, 주택구분, 모집공고일 값을 이용하여 오피스텔/도시형/민간임대 분양정보의 상세정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2022950004 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2022950004 | (Equal) 공고번호 |
| house_nm | 주택명 | 200 | 0 | (LIKE) | 주택명 |
| search_house_secd | 주택구분 | 4 | 0 | (EQ) 0201 | (Equal) 주택구분 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | (EQ) 100 | (Equal) 공급지역코드 |
| hssply_adres | 공급위치 | 256 | 0 | (LIKE) | 공급위치 |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (LT) | (Little)                  < ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (LTE) <br>2022-05-31 | (Little or Equal)         <= ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (GT) | (Greater)                  > ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (GTE) <br>2022-01-01 | (Greater or Equal)         >= ‘YYYY-MM-DD’ |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 1 | 2022950004 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 1 | 2022950004 | 공고번호 |
| house_nm | 주택명 | 200 | 0 | 힐스테이트 청량리 메트로블 (도시형생활주택) | 주택명 |
| house_secd | 주택구분코드 | 2 | 0 | 02 | 주택구분코드 |
| house_secd_nm | 주택구분코드명 | 4000 | 0 | 도시형/오피스텔/민간임대 | 주택구분코드명 |
| house_dtl_secd | 주택상세구분코드 | 2 | 0 | 01 | 주택상세구분코드 |
| house_dtl_secd_nm | 주택상세구분코드명 | 4000 | 0 | 도시형생활주택 | 주택상세구분코드명 |
| search_house_secd | 주택구분 | 4 | 0 | 0201 | 주택구분 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | 100 | 공급지역코드 |
| subscrpt_area_code_nm | 공급지역명 | 500 | 0 | 서울 | 공급지역명 |
| hssply_zip | 공급위치 우편번호 | 6 | 0 | 02560 | 공급위치 우편번호 |
| hssply_hshldco | 공급위치 | 256 | 0 | 서울특별시 동대문구 용두동 26-14번지 일원 | 공급위치 |
| tot_suply_hshldco | 공급규모 | 10 | 1 | 213 | 공급규모 |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | 2022-02-10 | 모집공고일 |
| nsprc_nm | 신문사 | 200 | 0 | 문화일보 | 신문사 |
| subscrpt_rcept_bgnde | 청약접수시작일 | 10 | 0 | 2022-02-21 | 청약접수시작일 |
| subscrpt_rcept_endde | 청약접수종료일 | 10 | 0 | 2022-02-22 | 청약접수종료일 |
| przwner_presnatn_de | 당첨자발표일 | 10 | 0 | 2022-03-02 | 당첨자발표일 |
| cntrct_cncls_bgnde | 계약시작일 | 10 | 0 | 2022-03-03 | 계약시작일 |
| cntrct_cncls_endde | 계약종료일 | 10 | 0 | 2022-03-04 | 계약종료일 |
| hmpg_adres | 홈페이지주소 | 256 | 0 | https://www.hillstate.co.kr/s/#cheongnyangri_metro | 홈페이지주소 |
| bsns_mby_nm | 사업주체명 (시행사) | 200 | 0 | ㈜하나자산신탁 | 사업주체명 (시행사) |
| mdhs_telno | 문의처 | 30 | 0 | 0234520100 | 문의처 |
| mvn_prearnge_ym | 입주예정월 | 6 | 0 | 202507 | 입주예정월 |
| pblanc_url | 모집공고 상세 URL | 300 | 0 | https://www.applyhome.co.kr/ai/aia/selectPRMOLttotPblancDetailView.do?houseManageNo=2022950004&pblancNo=2022950004&houseSecd=02 | 청약홈 분양정보 페이지 연결 URL |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getUrbtyOfctlLttotPblancDetail?page=1&perPage=10&cond%5BHOUSE_MANAGE_NO%3A%3AEQ%5D=2022950004&cond%5BPBLANC_NO%3A%3AEQ%5D=2022950004&cond%5BSEARCH_HOUSE_SECD%3A%3AEQ%5D=0201&cond%5BRCRIT_PBLANC_DE%3A%3ALTE%5D=2022-05-31&cond%5BRCRIT_PBLANC_DE%3A%3AGTE%5D=2022-01-01&serviceKey=서비스키
```

**응답 예시:**
```json
{
  "currentCount": 1,
  "data": [
    {
      "BSNS_MBY_NM": "(주)하나자산신탁",
      "CNTRCT_CNCLS_BGNDE": "2022-03-03",
      "CNTRCT_CNCLS_ENDDE": "2022-03-04",
      "HMPG_ADRES": "https://www.hillstate.co.kr/s/#cheongnyangri_metro",
      "HOUSE_DTL_SECD": "01",
      "HOUSE_DTL_SECD_NM": "도시형생활주택",
      "HOUSE_MANAGE_NO": 2022950004,
      "HOUSE_NM": "힐스테이트 청량리 메트로블(도시형생활주택)",
      "HOUSE_SECD": "02",
      "HOUSE_SECD_NM": "도시형/오피스텔/민간임대",
      "HSSPLY_ADRES": "서울특별시 동대문구 용두동 26-14번지 일원",
      "HSSPLY_ZIP": "02560",
      "MDHS_TELNO": "0234520100",
      "MVN_PREARNGE_YM": "202507",
      "NSPRC_NM": "문화일보",
      "PBLANC_NO": 2022950004,
"PBLANC_URL": “https://www.applyhome.co.kr/ai/aia/selectPRMOLttotPblancDetailView.do?houseManageNo=2022950004&pblancNo=2022950004&houseSecd=02”,
      "PRZWNER_PRESNATN_DE": "2022-03-02",
      "RCRIT_PBLANC_DE": "2022-02-10",
      "SEARCH_HOUSE_SECD": "0201",
      "SUBSCRPT_RCEPT_BGNDE": "2022-02-21",
      "SUBSCRPT_RCEPT_ENDDE": "2022-02-22",
      "TOT_SUPLY_HSHLDCO": 213
    }
  ],
  "matchCount": 1,
  "page": 1,
  "perPage": 10,
  "totalCount": 242
}
```

### 3.3 APT 잔여세대 분양정보 상세조회 (`getRemndrLttotPblancDetail`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 3 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | APT 잔여세대 분양정보 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호, 주택구분코드, 모집공고일 값을 이용하여 APT 잔여세대 분양정보의 상세 정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2022910110 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2022910110 | (Equal) 공고번호 |
| house_nm | 주택명 | 200 | 0 | (LIKE) | 주택명 |
| house_secd | 주택구분코드 | 2 | 0 | (EQ) 04 | (Equal) 주택구분코드 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | (EQ) 410 | (Equal) 공급지역코드 |
| hssply_adres | 공급위치 | 256 | 0 | (LIKE) | 공급위치 |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (LT) | (Little)                  < ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (LTE) <br>2022-05-31 | (Little or Equal)         <= ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (GT) | (Greater)                  > ‘YYYY-MM-DD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (GTE) <br>2022-01-01 | (Greater or Equal)         >= ‘YYYY-MM-DD’ |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 1 | 2022910110 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 1 | 2022910110 | 공고번호 |
| house_nm | 주택명 | 200 | 0 | 평택화양 휴먼빌 퍼스트시티 | 주택명 |
| house_secd | 주택구분코드 | 2 | 0 | 04 | 주택구분코드 |
| house_secd_nm | 주택구분코드명 | 4000 | 0 | 무순위 | 주택구분코드명 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | 410 | 공급지역코드 |
| subscrpt_area_code_nm | 공급지역명 | 500 | 0 | 경기 | 공급지역명 |
| hssply_zip | 공급위치 우편번호 | 6 | 0 | 17945 | 공급위치 우편번호 |
| hssply_adres | 공급위치 | 256 | 0 | 경기도 평택시 현덕면 화양길 94-39(평택화양지구 7-1BL | 공급위치 |
| tot_suply_hshldco | 공급규모 | 10 | 1 | 16 | 공급규모 |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | 2022-04-25 | 모집공고일 |
| nsprc_nm | 신문사 | 200 | 0 | - | 신문사 |
| subscrpt_rcept_bgnde | 청약접수시작일 | 10 | 0 | 2022-05-02 | 청약접수시작일 |
| subscrpt_rcept_endde | 청약접수종료일 | 10 | 0 | 2022-05-02 | 청약접수종료일 |
| spsply_rcept_bgnde | 특별공급접수시작일 | 10 | 0 | - | 특별공급접수시작일 |
| spsply_rcept_endde | 특별공급접수종료일 | 10 | 0 | - | 특별공급접수종료일 |
| gnrl_rcept_rcptde | 일반공급접수시작일 | 10 | 0 | - | 일반공급접수시작일 |
| gnrl_rcept_endde | 일반공급접수종료일 | 10 | 0 | - | 일반공급접수종료일 |
| przwner_presnatn_de | 당첨자발표일 | 10 | 0 | 2022-05-06 | 당첨자발표일 |
| cntrct_cncls_bgnde | 계약시작일 | 10 | 0 | 2022-05-13 | 계약시작일 |
| cntrct_cncls_endde | 계약종료일 | 10 | 0 | 2022-05-13 | 계약종료일 |
| hmpg_adres | 홈페이지주소 | 256 | 0 | http://pt-humanvill.com | 홈페이지주소 |
| bsns_mby_nm | 사업주체명 (시행사) | 200 | 0 | 일신건영㈜ | 사업주체명 (시행사) |
| mdhs_telno | 문의처 | 30 | 0 | 15779333 | 문의처 |
| mvn_prearnge_ym | 입주예정월 | 6 | 0 | 202508 | 입주예정월 |
| pblanc_url | 모집공고 상세 URL | 300 | 0 | https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancDetailView.do?houseManageNo=2022910110&pblancNo=2022910110 | 청약홈 분양정보 페이지 연결 URL |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getRemndrLttotPblancDetail?page=1&perPage=10&cond%5BHOUSE_MANAGE_NO%3A%3AEQ%5D=2022910110&cond%5BPBLANC_NO%3A%3AEQ%5D=2022910110&cond%5BHOUSE_SECD%3A%3AEQ%5D=04&cond%5BRCRIT_PBLANC_DE%3A%3ALTE%5D=2022-05-31&cond%5BRCRIT_PBLANC_DE%3A%3AGTE%5D=2022-01-01&serviceKey=서비스키
```

**응답 예시:**
```json
{
  "currentCount": 1,
  "data": [
    {
      "BSNS_MBY_NM": "일신건영(주)",
      "CNTRCT_CNCLS_BGNDE": "2022-05-13",
      "CNTRCT_CNCLS_ENDDE": "2022-05-13",
      "GNRL_RCEPT_BGNDE": null,
      "GNRL_RCEPT_ENDDE": null,
      "HMPG_ADRES": "http://pt-humanvill.com",
      "HOUSE_MANAGE_NO": 2022910110,
      "HOUSE_NM": "평택화양 휴먼빌 퍼스트시티",
      "HOUSE_SECD": "04",
      "HOUSE_SECD_NM": "무순위",
      "HSSPLY_ADRES": "경기도 평택시 현덕면 화양길 94-39(평택화양지구 7-1BL)",
      "HSSPLY_ZIP": "17945",
      "MDHS_TELNO": "15779333",
      "MVN_PREARNGE_YM": "202508",
"NSPRC_NM": "-",
      "PBLANC_NO": 2022910110,
"PBLANC_URL": “https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancDetailView.do?houseManageNo=2022910110&pblancNo=2022910110”,
      "PRZWNER_PRESNATN_DE": "2022-05-06",
      "RCRIT_PBLANC_DE": "2022-04-25",
      "SPSPLY_RCEPT_BGNDE": null,
      "SPSPLY_RCEPT_ENDDE": null,
      "SUBSCRPT_RCEPT_BGNDE": "2022-05-02",
      "SUBSCRPT_RCEPT_ENDDE": "2022-05-02",
      "TOT_SUPLY_HSHLDCO": 16
    }
  ],
  "matchCount": 1,
  "page": 1,
  "perPage": 10,
  "totalCount": 408
}
```

### 3.4 APT 분양정보 주택형별 상세조회 (`getAPTLttotPblancMdl`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 4 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | APT 분양정보 주택형별 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호 값을 이용하여 APT 분양정보 주택형별 상세정보를 제공<br>특별공급-청년, 신생아 세대수는 공공주택일 경우만 해당<br>(APT 분양정보 상세조회 서비스 내 HOUSE_DETAIL_SECD = '03' & PUBLIC_HOUSE_SPCLW_APPLC_AT ='Y')인 경우 공공주택에 해당 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2022000248 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2022000248 | (Equal) 공고번호 |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 1 | 2022000248 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 1 | 2022000248 | 공고번호 |
| model_no | 모델번호 | 2 | 0 | 01 | 모델번호 |
| house_ty | 주택형 | 17 | 0 | 058.8500A | 주택형 |
| suply_ar | 공급면적 | 17 | 0 | 80.3800 | 공급면적 |
| suply_hshldco | 일반공급세대수 | 10 | 0 | 8 | 일반공급세대수 |
| spsply_hshldco | 특별공급세대수 | 10 | 0 | 11 | 특별공급세대수 |
| mnych_hshldco | 특별공급-다자녀가구 세대수 | 10 | 0 | 2 | 특별공급-다자녀가구 세대수 |
| nwwds_hshldco | 특별공급-신혼부부 세대수 | 10 | 0 | 4 | 특별공급-신혼부부 세대수 |
| lfe_frst_hshldco | 특별공급-생애최초 세대수 | 10 | 0 | 2 | 특별공급-생애최초 세대수 |
| old_parnts_suport_hshldco | 특별공급-노부모부양 세대수 | 10 | 0 | 1 | 특별공급-노부모부양 세대수 |
| instt_recomend_hshldco | 특별공급-기관추천 세대수 | 10 | 0 | 2 | 특별공급-기관추천 세대수 |
| etc_hshldco | 특별공급-기타 세대수 | 10 | 0 | 0 | 특별공급-기타 세대수 |
| transr_instt_enfsn_hshldco | 특별공급-이전기관 세대수 | 10 | 0 | 0 | 특별공급-이전기관 세대수 |
| ygmn_hshldco | 특별공급-청년 세대수 | 10 | 0 | 0 | 특별공급-청년 세대수 |
| nwbb_hshldco | 특별공급-신생아 세대수 | 10 | 0 | 0 | 특별공급-신생아 세대수 |
| lttot_top_amount | 공급금액 (분양최고금액) | 20 | 0 | 80,720 | 공급금액 (분양최고금액) (단위:만원) |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancMdl?page=1&perPage=10&cond%5BHOUSE_MANAGE_NO%3A%3AEQ%5D=2022000248&cond%5BPBLANC_NO%3A%3AEQ%5D=2022000248&serviceKey=서비스키
```

**응답 예시:**
```json
{
  "currentCount": 5,
  "data": [
    {
      "ETC_HSHLDCO": 0,
      "HOUSE_MANAGE_NO": "2022000248",
      "HOUSE_TY": "058.8500A",
      "INSTT_RECOMEND_HSHLDCO": 2,
      "LFE_FRST_HSHLDCO": 2,
      "LTTOT_TOP_AMOUNT": "80720",
      "MNYCH_HSHLDCO": 2,
      "MODEL_NO": "01",
      "NWBB_HSHLDCO": 0,
      "NWWDS_HSHLDCO": 4,
      "OLD_PARNTS_SUPORT_HSHLDCO": 1,
      "PBLANC_NO": "2022000248",
      "SPSPLY_HSHLDCO": 11,
      "SUPLY_AR": "80.3800",
      "SUPLY_HSHLDCO": 8,
      "TRANSR_INSTT_ENFSN_HSHLDCO": 0,
      "YGMN_HSHLDCO": 0
    },
    {
      "ETC_HSHLDCO": 0,
      "HOUSE_MANAGE_NO": "2022000248",
      "HOUSE_TY": "058.1300B",
      "INSTT_RECOMEND_HSHLDCO": 1,
      "LFE_FRST_HSHLDCO": 1,
      "LTTOT_TOP_AMOUNT": "79380",
      "MNYCH_HSHLDCO": 1,
      "MODEL_NO": "02",
      "NWBB_HSHLDCO": 0,
      "NWWDS_HSHLDCO": 2,
      "OLD_PARNTS_SUPORT_HSHLDCO": 0,
      "PBLANC_NO": "2022000248",
      "SPSPLY_HSHLDCO": 5,
      "SUPLY_AR": "79.0500",
      "SUPLY_HSHLDCO": 6,
      "TRANSR_INSTT_ENFSN_HSHLDCO": 0,
      "YGMN_HSHLDCO": 0
    },
    {
      "ETC_HSHLDCO": 0,
      "HOUSE_MANAGE_NO": "2022000248",
      "HOUSE_TY": "058.0900C",
      "INSTT_RECOMEND_HSHLDCO": 4,
      "LFE_FRST_HSHLDCO": 4,
      "LTTOT_TOP_AMOUNT": "79410",
      "MNYCH_HSHLDCO": 4,
      "MODEL_NO": "03",
      "NWBB_HSHLDCO": 0,
      "NWWDS_HSHLDCO": 8,
      "OLD_PARNTS_SUPORT_HSHLDCO": 1,
      "PBLANC_NO": "2022000248",
      "SPSPLY_HSHLDCO": 21,
      "SUPLY_AR": "79.0700",
      "SUPLY_HSHLDCO": 17,
      "TRANSR_INSTT_ENFSN_HSHLDCO": 0,
      "YGMN_HSHLDCO": 0
    },
    {
      "ETC_HSHLDCO": 0,
      "HOUSE_MANAGE_NO": "2022000248",
      "HOUSE_TY": "059.8000 ",
      "INSTT_RECOMEND_HSHLDCO": 2,
      "LFE_FRST_HSHLDCO": 2,
      "LTTOT_TOP_AMOUNT": "81180",
      "MNYCH_HSHLDCO": 2,
      "MODEL_NO": "04",
      "NWBB_HSHLDCO": 0,
      "NWWDS_HSHLDCO": 4,
      "OLD_PARNTS_SUPORT_HSHLDCO": 1,
      "PBLANC_NO": "2022000248",
      "SPSPLY_HSHLDCO": 11,
      "SUPLY_AR": "80.8400",
      "SUPLY_HSHLDCO": 8,
      "TRANSR_INSTT_ENFSN_HSHLDCO": 0,
      "YGMN_HSHLDCO": 0
    },
    {
      "ETC_HSHLDCO": 0,
      "HOUSE_MANAGE_NO": "2022000248",
      "HOUSE_TY": "122.5100F",
      "INSTT_RECOMEND_HSHLDCO": 0,
      "LFE_FRST_HSHLDCO": 0,
      "LTTOT_TOP_AMOUNT": "173596",
      "MNYCH_HSHLDCO": 0,
      "MODEL_NO": "05",
      "NWBB_HSHLDCO": 0,
      "NWWDS_HSHLDCO": 0,
      "OLD_PARNTS_SUPORT_HSHLDCO": 0,
      "PBLANC_NO": "2022000248",
      "SPSPLY_HSHLDCO": 0,
      "SUPLY_AR": "165.3450",
      "SUPLY_HSHLDCO": 2,
      "TRANSR_INSTT_ENFSN_HSHLDCO": 0,
      "YGMN_HSHLDCO": 0
    }
  ],
  "matchCount": 5,
  "page": 1,
  "perPage": 10,
  "totalCount": 9846
}
```

### 3.5 오피스텔/도시형/민간임대/생활숙박시설 분양정보 주택형별 상세조회 (`getUrbtyOfctlLttotPblancMdl`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 5 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | 오피스텔/도시형/민간임대 분양정보 주택형별 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호 값을 이용하여 오피스텔/도시형/민간임대 분양정보 주택형별 상세 정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2022950004 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2022950004 | (Equal) 공고번호 |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| pblanc_no | 공고번호 | 40 | 1 | 2022950004 | 공고번호 |
| house_manage_no | 주택관리번호 | 40 | 1 | 2022950004 | 주택관리번호 |
| model_no | 모델번호 | 4 | 0 | 01 | 모델번호 |
| gp | 군 | 30 | 0 | 1 | 군 |
| tp | 타입 | 10 | 0 | 26 | 타입 |
| excluse_ar | 전용면적 | 17 | 0 | 26 | 전용면적 |
| suply_hshldco | 공급세대수 | 10 | 1 | 25 | 공급세대수 |
| suply_amount | 공급금액 (분양최고금액) | 20 | 0 | 53,740 | 공급금액 (분양최고금액) (단위:만원) |
| subscrpt_reqst_amount | 청약신청금 | 20 | 0 | 100 | 청약신청금 (단위:만원) |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getUrbtyOfctlLttotPblancMdl?page=1&perPage=10&cond%5BPBLANC_NO%3A%3AEQ%5D=2022950004&cond%5BHOUSE_MANAGE_NO%3A%3AEQ%5D=2022950004&serviceKey=서비스키
```

**응답 예시:**
```json
{
  "currentCount": 7,
  "data": [
    {
      "EXCLUSE_AR": 26,
      "GP": "1",
      "HOUSE_MANAGE_NO": 2022950004,
      "MODEL_NO": "01",
      "PBLANC_NO": 2022950004,
      "SUBSCRPT_REQST_AMOUNT": "100",
      "SUPLY_AMOUNT": "53,740",
      "SUPLY_HSHLDCO": 25,
      "TP": "26"
    },
    {
      "EXCLUSE_AR": 41,
      "GP": "2",
      "HOUSE_MANAGE_NO": 2022950004,
      "MODEL_NO": "02",
      "PBLANC_NO": 2022950004,
      "SUBSCRPT_REQST_AMOUNT": "100",
      "SUPLY_AMOUNT": "79,090",
      "SUPLY_HSHLDCO": 24,
      "TP": "41"
    },
    {
      "EXCLUSE_AR": 44,
      "GP": "2",
      "HOUSE_MANAGE_NO": 2022950004,
      "MODEL_NO": "02",
      "PBLANC_NO": 2022950004,
      "SUBSCRPT_REQST_AMOUNT": "100",
      "SUPLY_AMOUNT": "85,520",
      "SUPLY_HSHLDCO": 24,
      "TP": "44"
    },
    {
      "EXCLUSE_AR": 49,
      "GP": "3",
      "HOUSE_MANAGE_NO": 2022950004,
      "MODEL_NO": "03",
      "PBLANC_NO": 2022950004,
      "SUBSCRPT_REQST_AMOUNT": "100",
      "SUPLY_AMOUNT": "89,970",
      "SUPLY_HSHLDCO": 72,
      "TP": "48A"
    },
    {
      "EXCLUSE_AR": 49,
      "GP": "3",
      "HOUSE_MANAGE_NO": 2022950004,
      "MODEL_NO": "03",
      "PBLANC_NO": 2022950004,
      "SUBSCRPT_REQST_AMOUNT": "100",
      "SUPLY_AMOUNT": "89,210",
      "SUPLY_HSHLDCO": 24,
      "TP": "48A1"
    },
    {
      "EXCLUSE_AR": 49,
      "GP": "3",
      "HOUSE_MANAGE_NO": 2022950004,
      "MODEL_NO": "03",
      "PBLANC_NO": 2022950004,
      "SUBSCRPT_REQST_AMOUNT": "100",
      "SUPLY_AMOUNT": "89,430",
      "SUPLY_HSHLDCO": 22,
      "TP": "48B"
    },
    {
      "EXCLUSE_AR": 49,
      "GP": "3",
      "HOUSE_MANAGE_NO": 2022950004,
      "MODEL_NO": "03",
      "PBLANC_NO": 2022950004,
      "SUBSCRPT_REQST_AMOUNT": "100",
      "SUPLY_AMOUNT": "89,550",
      "SUPLY_HSHLDCO": 22,
      "TP": "48C"
    }
  ],
  "matchCount": 7,
  "page": 1,
  "perPage": 10,
  "totalCount": 1950
}
```

### 3.6 APT 잔여세대 분양정보 주택형별 상세조회 (`getRemndrLttotPblancMdl`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 6 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | APT 잔여세대 분양정보 주택형별 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호 값을 이용하여 APT 잔여세대 분양정보 주택형별 상세 정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2022910110 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2022910110 | (Equal) 공고번호 |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | 2022910110 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | 2022910110 | 공고번호 |
| model_no | 모델번호 | 2 | 0 | 01 | 모델번호 |
| house_ty | 모델타입 | 17 | 0 | 084.9840 | 모델타입 |
| suply_ar | 공급면적 | 17 | 0 | - | 공급면적 |
| suply_hshldco | 일반공급세대수 | 10 | 0 | 16 | 일반공급세대수 |
| spsply_hshldco | 특별공급세대수 | 10 | 0 | - | 특별공급세대수 |
| lttot_top_amount | 공급금액 (분양최고금액) | 20 | 0 | 46,357 | 공급금액 (분양최고금액) (단위:만원) |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getRemndrLttotPblancMdl?page=1&perPage=10&cond%5BHOUSE_MANAGE_NO%3A%3AEQ%5D=2022910110&cond%5BPBLANC_NO%3A%3AEQ%5D=2022910110&serviceKey=서비스키
```

**응답 예시:**
```json
{
  "currentCount": 1,
  "data": [
    {
      "HOUSE_MANAGE_NO": 2022910110,
      "HOUSE_TY": "084.9840 ",
      "LTTOT_TOP_AMOUNT": "46,357",
      "MODEL_NO": "01",
      "PBLANC_NO": 2022910110,
      "SPSPLY_HSHLDCO": null,
      "SUPLY_AR": null,
      "SUPLY_HSHLDCO": 16
    }
  ],
  "matchCount": 1,
  "page": 1,
  "perPage": 10,
  "totalCount": 1330
}
```

### 3.7 공공지원 민간임대 분양정보 상세조회 (`getPblPvtRentLttotPblancDetail`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 7 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | 공공지원 민간임대 분양정보 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호, 모집공고일 값을 이용하여 공공지원 민간임대 분양정보의 상세정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2024850001 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2024850001 | (Equal) 공고번호 |
| house_nm | 주택명 | 200 | 0 | (LIKE) | 주택명 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | (EQ) 621 | (Equal) 공급지역코드 |
| hssply_adres | 공급위치 | 256 |  | (LIKE) | 공급위치 |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (LT) | (Little)                  < ‘YYYYMMDD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (LTE) <br>20240131 | (Little or Equal)         <= ‘YYYYMMDD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (GT) | (Greater)                  > ‘YYYYMMDD’ |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | (GTE) <br>20240101 | (Greater or Equal)         >= ‘YYYYMMDD’ |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | 2024850001 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | 2024850001 | 공고번호 |
| house_nm | 주택명 | 200 | 0 | 성산 삼정그린코아 웰레스트 | 주택명 |
| house_secd | 주택구분코드 | 2 | 0 | 03 | 주택구분코드 |
| house_secd_nm | 주택구분코드명 | 4000 | 0 | 공공지원민간임대 | 주택구분코드명 |
| house_detail_secd | 주택상세구분코드 | 2 | 0 | 03 | 주택상세구분코드 |
| house_detail_secd_nm | 주택상세구분코드명 | 4000 | 0 | 공공지원민간임대 | 주택상세구분코드명 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | 621 | 공급지역코드 |
| subscrpt_area_code_nm | 공급지역명 | 500 | 0 | 경남 | 공급지역명 |
| rcrit_pblanc_de | 모집공고일 | 10 | 0 | 20240124 | 모집공고일 |
| nsprc_nm | 신문사 | 200 | 0 | 아시아경제 | 신문사 |
| subscrpt_rcept_bgnde | 청약접수시작일 | 10 | 0 | 20240129 | 청약접수시작일 |
| subscrpt_rcept_endde | 청약접수종료일 | 10 | 0 | 20240129 | 청약접수종료일 |
| przwner_presnatn_de | 당첨자발표일 | 10 | 0 | 20240201 | 당첨자발표일 |
| hssply_zip | 공급위치 우편번호 | 6 |  | 51551 | 공급위치 우편번호 |
| hssply_adres | 공급위치 | 256 |  | 경상남도 창원시 성산구 안민동 614-2번지 일원[창원안민 공공지원 민간임대주택 공급촉진지구] | 공급위치 |
| tot_suply_hshldco | 공급규모 | 10 |  | 163 | 공급규모 |
| cntrct_cncls_bgnde | 계약시작일 | 10 | 0 | 20240205 | 계약시작일 |
| cntrct_cncls_endde | 계약종료일 | 10 | 0 | 20240206 | 계약종료일 |
| hmpg_adres | 홈페이지주소 | 256 | 0 | http://ssgreencore2.com | 홈페이지주소 |
| bsns_mby_nm | 사업주체명 (시행사) | 200 | 0 | 창원뉴스테이 주식회사 | 사업주체명 (시행사) |
| mdhs_telno | 문의처 | 30 | 0 | 15668728 | 문의처 |
| mvn_prearnge_ym | 입주예정월 | 6 | 0 | 202502 | 입주예정월 |
| pblanc_url | 모집공고 상세 URL | 300 | 0 | https://www.applyhome.co.kr/ai/aia/selectPRMOLttotPblancDetailView.do?houseManageNo=2024850001&pblancNo=2024850001&houseSecd=03 | 청약홈 분양정보 페이지 연결 URL |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getPblPvtRentLttotPblancDetail?page=1&perPage=10&cond%5BPBLANC_NO%3A%3AEQ%5D=2024850001&cond%5BRCRIT_PBLANC_DE%3A%3ALT%5D=2024850001&cond%5BRCRIT_PBLANC_DE%3A%3ALTE%5D=20240131&cond%5BRCRIT_PBLANC_DE%3A%3AGTE%5D=20240101&serviceKey=서비스키
```

**응답 예시:**
```json
{
  "currentCount": 1,
  "data": [
    {
      "BSNS_MBY_NM": "창원뉴스테이 주식회사",
      "CNTRCT_CNCLS_BGNDE": "20240205",
      "CNTRCT_CNCLS_ENDDE": "20240206",
      "HMPG_ADRES": "http://ssgreencore2.com",
      "HOUSE_DETAIL_SECD": "03",
      "HOUSE_DETAIL_SECD_NM": "공공지원민간임대",
      "HOUSE_MANAGE_NO": "2024850001",
      "HOUSE_NM": "성산 삼정그린코아 웰레스트",
      "HOUSE_SECD": "03",
      "HOUSE_SECD_NM": "공공지원민간임대",
      "HSSPLY_ADRES": "경상남도 창원시 성산구 안민동 614-2번지 일원[창원안민 공공지원 민간임대주택 공급촉진지구]",
      "HSSPLY_ZIP": "51551",
      "MDHS_TELNO": "15668728",
      "MVN_PREARNGE_YM": "202502",
      "NSPRC_NM": "아시아경제",
      "PBLANC_NO": "2024850001",
      "PBLANC_URL": "https://www.applyhome.co.kr/ai/aia/selectPRMOLttotPblancDetailView.do?houseManageNo=2024850001&pblancNo=2024850001&houseSecd=03",
      "PRZWNER_PRESNATN_DE": "20240201",
      "RCRIT_PBLANC_DE": "20240124",
      "SEARCH_HOUSE_SECD": "0303",
"SUBSCRPT_AREA_CODE": "621",
"SUBSCRPT_AREA_CODE_NM": "경남",
      "SUBSCRPT_RCEPT_BGNDE": "20240129",
      "SUBSCRPT_RCEPT_ENDDE": "20240129",
      "TOT_SUPLY_HSHLDCO": 163
    }
  ],
  "matchCount": 1,
  "page": 1,
  "perPage": 10,
  "totalCount": 96
}
```

### 3.8 공공지원 민간임대 분양정보 주택형별 상세조회 (`getPblPvtRentLttotPblancMdl`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 8 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | 공공지원 민간임대 분양정보 주택형별 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호 값을 이용하여 공공지원 민간임대 분양정보 주택형별 상세 정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2024850001 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2024850001 | (Equal) 공고번호 |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | 2024850001 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | 2024850001 | 공고번호 |
| model_no | 모델번호 | 4 | 0 | 01 | 모델번호 |
| gp | 군 | 30 | 0 | - | 군 |
| tp | 타입 | 10 | 0 | 59A | 타입 |
| excluse_ar | 전용면적 | 17 | 0 | 59.9536 | 전용면적 |
| supply_ar | 공급면적 | 17 | 0 | 83.6704 | 공급면적 |
| cntrct_ar | 계약면적 | 17 | 0 | 121.9784 | 계약면적 |
| suply_hshldco | 공급세대수 | 10 | 0 | 43 | 공급세대수 |
| gnsply_hshldco | 일반공급 세대수 | 10 | 0 | 0 | 일반공급 세대수 |
| spsply_ygmn_hshldco | 특별공급 청년 세대수 | 10 | 0 | 2 | 특별공급 청년 세대수 |
| spsply_new_mrrg_hshldco | 특별공급 신혼 세대수 | 10 | 0 | 31 | 특별공급 신혼 세대수 |
| spsply_aged_hshldco | 특별공급 고령자 세대수 | 10 | 0 | 10 | 특별공급 고령자 세대수 |
| suply_amount | 공급금액(분양최고급액) (단위:만원) | 20 | 0 | 17900 | 공급금액(분양최고급액) (단위:만원) |
| subscrpt_reqst_amount | 청약신청금 (단위:만원) | 20 | 0 | 10 | 청약신청금 (단위:만원) |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getPblPvtRentLttotPblancMdl?page=1&perPage=10&cond%5BHOUSE_MANAGE_NO%3A%3AEQ%5D=2024850001&cond%5BPBLANC_NO%3A%3AEQ%5D=2024850001&serviceKey=서비스키
```

**응답 예시:**
```json
{
  "currentCount": 6,
  "data": [
    {
      "CNTRCT_AR": "121.9784",
      "EXCLUSE_AR": "59.9536",
      "GNSPLY_HSHLDCO": 0,
      "GP": "-",
      "HOUSE_MANAGE_NO": "2024850001",
      "MODEL_NO": "01",
      "PBLANC_NO": "2024850001",
      "SPSPLY_AGED_HSHLDCO": 10,
      "SPSPLY_NEW_MRRG_HSHLDCO": 31,
      "SPSPLY_YGMN_HSHLDCO": 2,
      "SUBSCRPT_REQST_AMOUNT": "10",
      "SUPLY_AMOUNT": "17900",
      "SUPLY_AR": "83.6704",
      "SUPLY_HSHLDCO": 43,
      "TP": "59A"
    }
],
  "matchCount": 6,
  "page": 1,
  "perPage": 1,
  "totalCount": 747
}
```

### 3.9 임의공급 분양정보 상세조회 (`getOPTLttotPblancDetail`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 9 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | 임의공급 분양정보 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호, 모집공고일 값을 이용하여 임의공급 분양정보의 상세정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2024940001 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2024940001 | (Equal) 공고번호 |
| house_nm | 주택명 | 200 | 0 | (LIKE) | 주택명 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | (EQ) 100 | (Equal) 공급지역코드 |
| hssply_adres | 공급위치 | 256 | 0 | (LIKE) | 공급위치 |
| rcrit_pblanc_de | 모집공고일 | 8 | 0 | (LT) | (Little)                  < ‘YYYYMMDD’ |
| rcrit_pblanc_de | 모집공고일 | 8 | 0 | (LTE) <br>20240131 | (Little or Equal)         <= ‘YYYYMMDD’ |
| rcrit_pblanc_de | 모집공고일 | 8 | 0 | (GT) | (Greater)                  > ‘YYYYMMDD’ |
| rcrit_pblanc_de | 모집공고일 | 8 | 0 | (GTE) <br>20240101 | (Greater or Equal)         >= ‘YYYYMMDD’ |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | 2024940001 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | 2024940001 | 공고번호 |
| house_nm | 주택명 | 200 | 0 | 신독산 솔리힐 뉴포레(2차) | 주택명 |
| house_secd | 주택구분코드 | 2 | 0 | 11 | 주택구분코드 |
| house_secd_nm | 주택구분코드명 | 4000 | 0 | 임의공급 | 주택구분코드명 |
| subscrpt_area_code | 공급지역코드 | 3 | 0 | 100 | 공급지역코드 |
| subscrpt_area_code_nm | 공급지역명 | 500 | 0 | 서울 | 공급지역명 |
| hssply_zip | 공급위치 우편번호 | 6 | 0 | 08552 | 공급위치 우편번호 |
| hssply_adres | 공급위치 | 256 | 0 | 서울특별시 금천구 독산동 234-72 일원 | 공급위치 |
| tot_suply_hshldco | 공급규모 | 10 | 0 | 9 | 공급규모 |
| rcrit_pblanc_de | 모집공고일 | 8 | 0 | 20240118 | 모집공고일 |
| subscrpt_rcept_bgnde | 청약접수시작일 | 8 | 0 | 20240122 | 청약접수시작일 |
| subscrpt_rcept_endde | 청약접수종료일 | 8 | 0 | 20240122 | 청약접수종료일 |
| spsply_rcept_bgnde | 특별공급접수시작일 | 8 | 0 | - | 특별공급접수시작일 |
| spsply_rcept_endde | 특별공급접수종료일 | 8 | 0 | - | 특별공급접수종료일 |
| gnrl_rcept_gbnde | 일반공급접수시작일 | 8 | 0 | - | 일반공급접수시작일 |
| gnrl_rcept_endde | 일반공급접수종료일 | 8 | 0 | - | 일반공급접수종료일 |
| przwner_presnatn_de | 당첨자발표일 | 8 | 0 | 20240125 | 당첨자발표일 |
| cntrct_cncls_bgnde | 계약시작일 | 8 | 0 | 20240201 | 계약시작일 |
| cntrct_cncls_endde | 계약종료일 | 8 | 0 | 20240201 | 계약종료일 |
| hmpg_adres | 홈페이지주소 | 256 | 0 | https://solihil.imweb.me | 홈페이지주소 |
| bsns_mby_nm | 사업주체명 (시행사) | 200 | 0 | 동진빌라가로주택정비사업조합 | 사업주체명 (시행사) |
| mdhs_telno | 문의처 | 30 | 0 | 028302468 | 문의처 |
| mvn_prearnge_ym | 입주예정월 | 6 | 0 | 202402 | 입주예정월 |
| pblanc_url | 모집공고 상세 URL | 300 | 0 | https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancDetailView.do?houseManageNo=2024940001&pblancNo=2024940001 | 청약홈 분양정보 페이지 연결 URL |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getOPTLttotPblancDetail?page=1&perPage=10&cond%5BPBLANC_NO%3A%3AEQ%5D=2024940001&cond%5BRCRIT_PBLANC_DE%3A%3ALT%5D=2024940001&cond%5BRCRIT_PBLANC_DE%3A%3ALTE%5D=20240131&cond%5BRCRIT_PBLANC_DE%3A%3AGTE%5D=20240101&serviceKey= 서비스키
```

**응답 예시:**
```json
{
  "currentCount": 1,
  "data": [
    {
      "BSNS_MBY_NM": "동진빌라가로주택정비사업조합",
      "CNTRCT_CNCLS_BGNDE": "20240201",
      "CNTRCT_CNCLS_ENDDE": "20240201",
      "GNRL_RCEPT_BGNDE": null,
      "GNRL_RCEPT_ENDDE": null,
      "HMPG_ADRES": "https://solihil.imweb.me",
      "HOUSE_MANAGE_NO": "2024940001",
      "HOUSE_NM": "신독산 솔리힐 뉴포레(2차)",
      "HOUSE_SECD": "11",
      "HOUSE_SECD_NM": "임의공급",
      "HSSPLY_ADRES": "서울특별시 금천구 독산동 234-72 일원",
      "HSSPLY_ZIP": "08552",
      "MDHS_TELNO": "028302468",
      "MVN_PREARNGE_YM": "202402",
      "PBLANC_NO": "2024940001",
      "PBLANC_URL": "https://www.applyhome.co.kr/ai/aia/selectAPTRemndrLttotPblancDetailView.do?houseManageNo=2024940001&pblancNo=2024940001",
      "PRZWNER_PRESNATN_DE": "20240125",
      "RCRIT_PBLANC_DE": "20240118",
      "SPSPLY_RCEPT_BGNDE": null,
      "SPSPLY_RCEPT_ENDDE": null,
      "SUBSCRPT_RCEPT_BGNDE": "20240122",
      "SUBSCRPT_RCEPT_ENDDE": "20240122",
      "TOT_SUPLY_HSHLDCO": 9
    }
  ],
  "matchCount": 1,
  "page": 1,
  "perPage": 10,
  "totalCount": 93
}
```

### 3.10 임의공급 분양정보 주택형별 상세조회 (`getOPTLttotPblancMdl`)

#### 상세기능 정보

| 항목 | 내용 |
|---|---|
| 상세기능 번호 | 10 |
| 상세기능 유형 | 조회 |
| 상세기능명(국문) | 임의공급 분양정보 주택형별 상세조회 |
| 상세기능 설명 | 주택관리번호, 공고번호 값을 이용하여 임의공급 분양정보 주택형별 상세 정보를 제공 |

#### 요청 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | (EQ) 2024940001 | (Equal) 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | (EQ) 2024940001 | (Equal) 공고번호 |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 응답 메시지 명세

| 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명 |
|---|---|---|---|---|---|
| house_manage_no | 주택관리번호 | 40 | 0 | 2024940001 | 주택관리번호 |
| pblanc_no | 공고번호 | 40 | 0 | 2024940001 | 공고번호 |
| model_no | 모델번호 | 2 | 0 | 01 | 모델번호 |
| house_ty | 주택형 | 17 | 0 | 059.1669A | 주택형 |
| suply_hshldco | 일반공급세대수 | 10 | 0 | 1 | 일반공급세대수 |
| lttot_top_amount | 공급금액(분양최고금액) (단위:만원) | 20 | 0 | 77,600 | 공급금액(분양최고금액) (단위:만원) |

※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)

#### 요청 / 응답 메시지 예제

**요청 예시:**
```
https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getOPTLttotPblancMdl?page=1&perPage=10&cond%5BHOUSE_MANAGE_NO%3A%3AEQ%5D=2024940001&cond%5BPBLANC_NO%3A%3AEQ%5D=2024940001&serviceKey=서비스키
```

**응답 예시:**
```json
{
  "currentCount": 5,
  "data": [
    {
      "HOUSE_MANAGE_NO": "2024940001",
      "HOUSE_TY": "059.1669A",
      "LTTOT_TOP_AMOUNT": "77,600",
      "MODEL_NO": "01",
      "PBLANC_NO": "2024940001",
      "SUPLY_HSHLDCO": 1
    },
    {
      "HOUSE_MANAGE_NO": "2024940001",
      "HOUSE_TY": "059.5063C",
      "LTTOT_TOP_AMOUNT": "78,000",
      "MODEL_NO": "02",
      "PBLANC_NO": "2024940001",
      "SUPLY_HSHLDCO": 1
    },
    {
      "HOUSE_MANAGE_NO": "2024940001",
      "HOUSE_TY": "068.5501B",
      "LTTOT_TOP_AMOUNT": "69,700",
      "MODEL_NO": "03",
      "PBLANC_NO": "2024940001",
      "SUPLY_HSHLDCO": 2
    },
    {
      "HOUSE_MANAGE_NO": "2024940001",
      "HOUSE_TY": "068.7601C",
      "LTTOT_TOP_AMOUNT": "68,800",
      "MODEL_NO": "04",
      "PBLANC_NO": "2024940001",
      "SUPLY_HSHLDCO": 3
    },
    {
      "HOUSE_MANAGE_NO": "2024940001",
      "HOUSE_TY": "068.7509D",
      "LTTOT_TOP_AMOUNT": "67,400",
      "MODEL_NO": "05",
      "PBLANC_NO": "2024940001",
      "SUPLY_HSHLDCO": 2
    }
  ],
  "matchCount": 5,
  "page": 1,
  "perPage": 10,
  "totalCount": 47
}
```

---

## 4. OpenAPI 에러 코드정리

| 에러코드 | 설명 |
|---|---|
| 200 | 성공적으로 수행됨 |
| 401 | 인증 정보가 정확하지 않음 |
| 500 | API서버에 문제가 발생하였음 |
