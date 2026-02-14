# CrossRef REST API Reference

> 조사일: 2026-02-13
> Base URL: `https://api.crossref.org`
> 공식 문서: https://www.crossref.org/documentation/retrieve-metadata/rest-api/

---

## 1. Endpoints

| Endpoint | 용도 | 예시 |
|----------|------|------|
| `GET /works` | 서지 메타데이터 검색 | `/works?query.title=machine+learning&rows=5` |
| `GET /works/{DOI}` | 특정 DOI 조회 | `/works/10.1234/example` |
| `GET /journals` | 등록된 저널 목록 | `/journals?query=psychology` |
| `GET /journals/{ISSN}/works` | 특정 저널의 작업 목록 | `/journals/1234-5678/works` |
| `GET /members` | 메타데이터 기탁 기관 | `/members?query=elsevier` |
| `GET /funders` | Open Funder Registry | `/funders?query=NIH` |
| `GET /types` | 작업 유형 목록 (30개) | `/types` |
| `GET /licenses` | 등록된 라이선스 | `/licenses` |
| `GET /prefixes/{prefix}` | DOI prefix 정보 | `/prefixes/10.1234` |

---

## 2. /works 쿼리 파라미터

### 검색 (Search)

| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `query` | 전체 텍스트 검색 | `query=climate+change` |
| `query.title` | 제목 검색 | `query.title=machine+learning` |
| `query.author` | 저자 검색 | `query.author=smith` |
| `query.bibliographic` | 서지 정보 검색 | `query.bibliographic=nature+2024` |
| `query.affiliation` | 소속 기관 검색 | `query.affiliation=MIT` |

### 페이지네이션

| 파라미터 | 설명 | 기본값/제한 |
|---------|------|------------|
| `rows` | 페이지당 결과 수 | 기본 20, 최대 1000 |
| `offset` | 결과 오프셋 | 최대 10,000 |
| `cursor` | Deep paging용 커서 | `cursor=*`로 시작 |
| `sample` | 랜덤 샘플 | 최대 100 |

### 정렬

| 파라미터 | 값 |
|---------|---|
| `sort` | `score`, `updated`, `deposited`, `indexed`, `published`, `published-print`, `published-online`, `issued`, `is-referenced-by-count`, `references-count` |
| `order` | `asc`, `desc` |

### 응답 최적화

| 파라미터 | 설명 | 예시 |
|---------|------|------|
| `select` | 필요한 필드만 요청 | `select=DOI,title,author,type,event` |
| `mailto` | Polite pool 접근 | `mailto=your@email.com` |

---

## 3. 필터 (filter 파라미터)

사용법: `filter=name:value` (복수: 쉼표 구분)

### 날짜 필터

| 필터 | 설명 |
|------|------|
| `from-pub-date`, `until-pub-date` | 출판일 범위 |
| `from-print-pub-date`, `until-print-pub-date` | 인쇄판 출판일 |
| `from-online-pub-date`, `until-online-pub-date` | 온라인 출판일 |
| `from-posted-date`, `until-posted-date` | 게시일 (preprint) |
| `from-accepted-date`, `until-accepted-date` | 승인일 |
| `from-approved-date`, `until-approved-date` | 학위논문 승인일 |
| `from-event-start-date`, `until-event-start-date` | 학회 시작일 |
| `from-event-end-date`, `until-event-end-date` | 학회 종료일 |

### Boolean 존재 여부 필터

| 필터 | 설명 |
|------|------|
| `has-abstract` | 초록 포함 여부 |
| `has-references` | 참고문헌 목록 포함 |
| `has-full-text` | 전문 링크 포함 |
| `has-event` | 학회/이벤트 정보 포함 |
| `has-orcid` | ORCID ID 포함 |
| `has-funder` | 연구비 정보 포함 |
| `has-license` | 라이선스 정보 포함 |
| `has-affiliation` | 소속 기관 정보 포함 |

### 완전 일치 필터

| 필터 | 설명 |
|------|------|
| `doi` | DOI |
| `issn` | ISSN |
| `isbn` | ISBN |
| `type` | 작업 유형 (예: `journal-article`) |
| `member` | CrossRef 회원 ID |
| `prefix` | DOI prefix |
| `container-title` | 저널/도서명 완전 일치 |
| `orcid` | 기여자 ORCID |

---

## 4. Work 응답 스키마

### 핵심 필드

```json
{
  "DOI": "10.1234/example",
  "title": ["Article Title"],
  "type": "journal-article",
  "publisher": "Publisher Name",
  "URL": "https://doi.org/10.1234/example",
  "created": { "date-parts": [[2024, 1, 15]] },
  "deposited": { "date-parts": [[2024, 1, 15]] },
  "indexed": { "date-parts": [[2024, 1, 16]] },
  "issued": { "date-parts": [[2024]] },
  "references-count": 42,
  "is-referenced-by-count": 10
}
```

### 출판 정보

| 필드 | 타입 | 설명 |
|------|------|------|
| `container-title` | String[] | 저널/학회/도서명 |
| `short-container-title` | String[] | 약어 |
| `volume` | String | 권 |
| `issue` | String | 호 |
| `page` | String | 페이지 (예: `"123-145"`) |
| `article-number` | String | 기사 번호 |
| `publisher-location` | String | 출판사 위치 (드물게 존재) |
| `edition-number` | String | 판 번호 (드물게 존재) |

### 기여자 (Contributor) 구조

`author`, `editor`, `chair`, `translator` 필드에 사용:

```json
{
  "family": "Kim",
  "given": "Byung",
  "ORCID": "https://orcid.org/0000-0001-2345-6789",
  "authenticated-orcid": true,
  "affiliation": [
    { "name": "Seoul National University" }
  ],
  "sequence": "first"
}
```

### 날짜 구조

`published-print`, `published-online`, `issued` 등에 사용:

```json
{
  "date-parts": [[2024, 3, 15]],
  "date-time": "2024-03-15T00:00:00Z",
  "timestamp": 1710460800000
}
```

- `date-parts[0]`: `[year]`, `[year, month]`, 또는 `[year, month, day]`

### 학회/이벤트 (Event) 구조

`proceedings-article` 타입에서 주로 존재:

```json
{
  "event": {
    "name": "Annual Conference on Machine Learning",
    "location": "Vienna, Austria",
    "start": { "date-parts": [[2024, 7, 21]] },
    "end": { "date-parts": [[2024, 7, 25]] },
    "theme": "AI for Good",
    "acronym": "ICML",
    "sponsor": ["ACM"]
  }
}
```

### 기관 (Institution) 구조

`dissertation` 타입에서 학위 수여 기관:

```json
{
  "institution": [
    {
      "name": "Massachusetts Institute of Technology",
      "department": ["Computer Science"],
      "acronym": ["MIT"]
    }
  ],
  "degree": ["PhD"]
}
```

### 기타 유용한 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `abstract` | String | JATS XML 형식 초록 |
| `subject` | String[] | 주제 카테고리 |
| `ISSN` | String[] | 저널 ISSN |
| `ISBN` | String[] | 도서 ISBN |
| `license` | License[] | 라이선스 정보 |
| `funder` | Funder[] | 연구비 지원 정보 |
| `reference` | Reference[] | 참고문헌 목록 |
| `link` | Link[] | 전문 URL |
| `alternative-id` | String[] | 대체 식별자 (보고서 번호 등) |
| `report-number` | String | 보고서 번호 (비표준, 드물게 존재) |

---

## 5. Work Type 전체 목록 (30개)

`GET /types`로 확인 가능.

| type ID | 한국어 | 우리 코드 매핑 |
|---------|--------|---------------|
| `journal-article` | 저널 논문 | `journal` |
| `book-chapter` | 도서 챕터 | `chapter` |
| `book-section` | 도서 섹션 | 미매핑 (→ `chapter` 가능) |
| `book-part` | 도서 파트 | 미매핑 (→ `chapter` 가능) |
| `proceedings-article` | 학회 논문 | `conference` |
| `book` | 도서 | `book` |
| `monograph` | 단행본 | `book` |
| `edited-book` | 편집 도서 | `book` |
| `reference-book` | 참고 도서 | `book` |
| `book-set` | 도서 세트 | 미매핑 |
| `book-series` | 도서 시리즈 | 미매핑 |
| `book-track` | 도서 트랙 | 미매핑 |
| `report` | 보고서 | `report` |
| `report-series` | 보고서 시리즈 | 미매핑 |
| `report-component` | 보고서 구성요소 | 미매핑 |
| `dissertation` | 학위논문 | `dissertation` |
| `posted-content` | 게시 콘텐츠 (preprint) | `web` |
| `journal` | 저널 자체 | 미매핑 |
| `journal-volume` | 저널 권 | 미매핑 |
| `journal-issue` | 저널 호 | 미매핑 |
| `proceedings` | 학회 전체 | 미매핑 |
| `proceedings-series` | 학회 시리즈 | 미매핑 |
| `reference-entry` | 참고 항목 | 미매핑 |
| `component` | 구성요소 | 미매핑 |
| `standard` | 표준 | 미매핑 |
| `standard-series` | 표준 시리즈 | 미매핑 |
| `dataset` | 데이터셋 | 미매핑 |
| `grant` | 연구비 | 미매핑 |
| `peer-review` | 피어 리뷰 | 미매핑 |
| `other` | 기타 | 미매핑 |

---

## 6. Rate Limiting

> 2025년 12월 1일부터 적용된 새 정책

| Pool | 접근 방법 | 단일 DOI | 쿼리/목록 | 동시 요청 |
|------|----------|---------|----------|----------|
| **Anonymous** | 인증 없음 | 5 req/s | 1 req/s | 1 |
| **Polite** (권장) | `mailto` 파라미터 | 10 req/s | 3 req/s | 3 |
| **Plus** | API 키 | 150 req/s | 제한 없음 | 제한 없음 |

### Polite Pool 사용법

```
# 방법 1: 쿼리 파라미터
GET /works?query.title=AI&mailto=research@example.com

# 방법 2: User-Agent 헤더
User-Agent: CitationValidator/1.0 (https://example.com; mailto:research@example.com)
```

### 429 응답 처리

Rate limit 초과 시 `HTTP 429` 반환. 응답 헤더 확인:
- `x-rate-limit-limit`: 허용 요청 수
- `x-rate-limit-interval`: 시간 간격

---

## 7. 우리 프로젝트 통합 현황

### 현재 사용 중인 호출

```typescript
// 제목으로 검색 (client.ts:searchByTitle)
GET /works?query.title={title}&rows=1&mailto={email}

// DOI로 조회 (client.ts:lookupByDOI)
GET /works/{DOI}?mailto={email}
```

### 추출하는 필드

| CrossRef 필드 | 우리 필드 | 상태 |
|--------------|----------|------|
| `DOI` | `doi` | ✅ 사용 중 |
| `title[0]` | `title` | ✅ 사용 중 |
| `author[]` | `authors` | ✅ 사용 중 |
| `editor[]` | `editors` | ✅ 사용 중 |
| `container-title[0]` | `source` | ✅ 사용 중 |
| `volume` | `volume` | ✅ 사용 중 |
| `issue` | `issue` | ✅ 사용 중 |
| `page` | `pages` | ✅ 사용 중 |
| `publisher` | `publisher` | ✅ 사용 중 |
| `type` | type 매핑 | ✅ 사용 중 |
| `edition-number` | `edition` | ✅ 사용 중 |
| `published-print/online` | `year` | ✅ 사용 중 |
| `event.name` | `conferenceName` | ✅ 신규 추가 |
| `institution[0].name` | `institution` | ✅ 신규 추가 |
| `report-number` | `reportNumber` | ✅ 신규 추가 |

### 개선 가능 사항

1. **`select` 파라미터 사용**: 응답 크기 최적화
   ```
   ?select=DOI,title,author,editor,container-title,volume,issue,page,publisher,type,event,institution
   ```

2. **`event.location` 추출**: 학회 장소 정보 활용

3. **`alternative-id`에서 보고서 번호**: `report-number`가 없을 경우 대체

4. **`book-section`, `book-part` 매핑**: → `chapter`로 추가 매핑 가능

5. **`degree` 필드**: 학위 유형 (PhD, MA 등) 활용 가능

---

## 8. API 호출 예시

### 저널 논문 검색

```bash
curl "https://api.crossref.org/works?query.title=impact+of+AI+on+education&rows=1&mailto=research@example.com"
```

### 학회 논문 검색 (이벤트 필터)

```bash
curl "https://api.crossref.org/works?query.title=deep+learning&filter=type:proceedings-article,has-event:true&rows=5&mailto=research@example.com"
```

### 학위논문 검색

```bash
curl "https://api.crossref.org/works?filter=type:dissertation&query.author=johnson&rows=5&mailto=research@example.com"
```

### 특정 DOI 조회 (선택 필드)

```bash
curl "https://api.crossref.org/works/10.1234/example?mailto=research@example.com&select=DOI,title,author,type,event"
```

---

## 참고 문서

- [CrossRef REST API 공식 문서](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
- [REST API 필터 문서](https://www.crossref.org/documentation/retrieve-metadata/rest-api/rest-api-filters/)
- [GitHub REST API 문서](https://github.com/CrossRef/rest-api-doc)
- [API 포맷 문서](https://github.com/CrossRef/rest-api-doc/blob/master/api_format.md)
- [Rate Limit 변경 공지](https://www.crossref.org/blog/announcing-changes-to-rest-api-rate-limits/)
- [접근 및 인증](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/)
- [학회 논문 마크업 가이드](https://www.crossref.org/documentation/schema-library/markup-guide-record-types/conference-proceedings/)
- [학위논문 문서](https://www.crossref.org/documentation/principles-practices/dissertations/)
- [Types 엔드포인트](https://api.crossref.org/types)
- [API 사용 팁](https://www.crossref.org/documentation/retrieve-metadata/rest-api/tips-for-using-the-crossref-rest-api/)
