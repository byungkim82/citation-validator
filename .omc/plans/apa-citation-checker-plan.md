# APA Citation Checker - Work Plan

## Project Overview

**Goal**: Google Scholar에서 복사한 APA 참고문헌을 붙여넣으면 APA 7th Edition 규칙에 맞게 검증하고, 가능한 항목은 자동 수정하는 Next.js 웹앱

**핵심 워크플로우**:
```
사용자가 citation 텍스트 붙여넣기
  → APA 7th 규칙 기반 검증 (12개 체크포인트)
  → 자동 수정 가능 항목 자동 적용 (DOI 추가, 대소문자 변환 등)
  → 수동 확인 필요 항목 하이라이트 + 제안
  → 수정된 최종 citation 복사 가능
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Next.js App                  │
├──────────────┬──────────────────────────────┤
│  Frontend    │  Backend (API Routes)         │
│  - 입력 UI   │  - /api/validate             │
│  - 결과 표시  │  - /api/crossref-lookup      │
│  - 복사 기능  │  - /api/auto-fix             │
├──────────────┴──────────────────────────────┤
│              Core Libraries                  │
│  - citation-js (파싱)                        │
│  - Custom APA 7th Validator (검증 엔진)       │
│  - CrossRef API Client (DOI/메타데이터 조회)   │
└─────────────────────────────────────────────┘
```

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Citation Parsing**: citation-js
- **Metadata API**: CrossRef REST API
- **Deployment**: Vercel (optional)

---

## Implementation Phases

### Phase 1: 프로젝트 셋업 및 기본 구조
**예상 파일**: 5-8개

1. Next.js 프로젝트 초기화 (TypeScript, Tailwind, shadcn/ui)
2. 프로젝트 디렉토리 구조 설계
3. 기본 레이아웃 및 페이지 구성

```
citation-management/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # 메인 페이지
│   │   └── api/
│   │       ├── validate/route.ts
│   │       └── crossref/route.ts
│   ├── components/
│   │   ├── CitationInput.tsx   # 입력 영역
│   │   ├── ValidationResult.tsx # 검증 결과
│   │   ├── CitationCard.tsx    # 개별 citation 결과 카드
│   │   └── FixedCitation.tsx   # 수정된 citation 표시
│   ├── lib/
│   │   ├── validator/
│   │   │   ├── index.ts        # 검증 엔진 진입점
│   │   │   ├── rules.ts        # APA 7th 규칙 정의
│   │   │   ├── parser.ts       # citation 텍스트 파싱
│   │   │   └── auto-fix.ts     # 자동 수정 로직
│   │   ├── crossref/
│   │   │   └── client.ts       # CrossRef API 클라이언트
│   │   └── types.ts            # 공통 타입 정의
│   └── hooks/
│       └── useCitationValidator.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

### Phase 2: Citation 파싱 엔진
**예상 파일**: 3-4개

1. **Citation 텍스트 파서** (`parser.ts`)
   - Google Scholar APA 형식 텍스트를 구조화된 데이터로 분해
   - 정규식 기반 필드 추출: 저자, 연도, 제목, 저널명, 볼륨, 이슈, 페이지, DOI/URL
   - 여러 citation을 줄바꿈으로 분리하여 일괄 처리

2. **타입 정의** (`types.ts`)
   ```typescript
   interface ParsedCitation {
     raw: string;              // 원본 텍스트
     authors: Author[];        // 파싱된 저자 목록
     year: string;            // 출판연도
     title: string;           // 논문/책 제목
     source: string;          // 저널명/출판사
     volume?: string;
     issue?: string;
     pages?: string;
     doi?: string;
     url?: string;
     type: 'journal' | 'book' | 'chapter' | 'web' | 'unknown';
   }

   interface Author {
     lastName: string;
     initials: string;       // "F. M."
   }

   interface ValidationResult {
     citation: ParsedCitation;
     errors: ValidationError[];
     warnings: ValidationWarning[];
     fixedCitation: string;   // 자동 수정된 결과
     autoFixApplied: AutoFix[];
     manualFixNeeded: ManualFix[];
   }

   interface ValidationError {
     rule: string;            // 규칙 ID
     field: string;           // 오류 필드
     message: string;         // 설명
     severity: 'error' | 'warning' | 'info';
     original: string;        // 원본 값
     suggested?: string;      // 제안 수정값
     autoFixable: boolean;
   }
   ```

### Phase 3: APA 7th Validation 규칙 엔진
**예상 파일**: 2-3개

**자동 수정 가능 (Auto-fixable) 규칙**:

| # | 규칙 | 검증 방법 | 자동 수정 |
|---|------|----------|----------|
| 1 | 저자 형식 `Surname, F. M.` | 정규식 | 형식 변환 |
| 2 | 연도 형식 `(YYYY).` | 정규식 | 괄호/마침표 추가 |
| 3 | DOI 형식 `https://doi.org/...` | 정규식 | CrossRef 조회 후 추가 |
| 4 | DOI 뒤 마침표 없음 | 정규식 | 마침표 제거 |
| 5 | `Vol.` 접두사 제거 | 문자열 검색 | 접두사 삭제 |
| 6 | `pp.` 접두사 제거 | 문자열 검색 | 접두사 삭제 |
| 7 | 페이지 범위 en dash `–` | 정규식 | hyphen → en dash |
| 8 | 마지막 저자 앞 `&` (≤20명) | 파싱 | `&` 추가/수정 |
| 9 | 제목 sentence case 변환 | 휴리스틱 | 대소문자 변환 |
| 10 | Volume(Issue) 형식 정규화 | 정규식 | 형식 변환 |

**수동 확인 필요 (Manual check) 규칙**:

| # | 규칙 | 이유 |
|---|------|------|
| 11 | 고유명사 대소문자 | NLP 없이 완벽 판별 불가 |
| 12 | 저널명 정확성 | 외부 DB 대조 필요 |

### Phase 4: CrossRef API 통합
**예상 파일**: 1-2개

1. **CrossRef 클라이언트** (`crossref/client.ts`)
   - 제목 기반 논문 검색 (DOI가 없을 때)
   - DOI 기반 메타데이터 조회
   - Rate limiting (polite pool: 50 req/sec)
   - 응답 캐싱

2. **메타데이터 대조 로직**
   - CrossRef에서 가져온 정보와 파싱된 citation 비교
   - 불일치 항목 자동 수정 또는 경고 표시
   - DOI 자동 추가 (누락 시)

### Phase 5: 프론트엔드 UI
**예상 파일**: 5-6개

1. **메인 페이지** (`page.tsx`)
   - 상단: 프로젝트 설명
   - 중앙: 텍스트 입력 영역 (여러 citation 붙여넣기)
   - 하단: 검증 결과 표시

2. **CitationInput 컴포넌트**
   - 대형 textarea (여러 citation 지원)
   - "검증하기" 버튼
   - 예시 citation 삽입 버튼
   - 드래그앤드롭 지원 (optional)

3. **ValidationResult 컴포넌트**
   - 각 citation별 카드 형태 결과 표시
   - 오류/경고/정보 아이콘 + 색상 구분
   - 원본 vs 수정본 비교 (diff 뷰)
   - "수정된 citation 복사" 버튼

4. **CitationCard 컴포넌트**
   - 개별 citation의 검증 상태 표시
   - 펼치기/접기 기능
   - 각 오류 항목별 상세 설명
   - 자동 수정 항목: ✅ 표시 + 변경 내용
   - 수동 확인 항목: ⚠️ 표시 + 가이드

5. **UI 상태 관리** (`useCitationValidator.ts`)
   - 입력 텍스트 상태
   - 검증 로딩 상태
   - 결과 목록 관리
   - 복사 기능

### Phase 6: 통합 테스트 및 마무리
**예상 파일**: 2-3개

1. 실제 Google Scholar citation으로 end-to-end 테스트
2. Edge case 처리 (저자 21명+, 특수문자, 비영어 저자명 등)
3. 에러 핸들링 (CrossRef API 실패 시 graceful degradation)
4. 반응형 디자인 확인

---

## 검증 엔진 상세 로직

### 파싱 전략

Google Scholar APA citation 텍스트 예시:
```
Kim, B. Y., & Lee, S. H. (2024). The impact of AI on education: A systematic review. Journal of Educational Technology, 45(2), 123-145. https://doi.org/10.1234/jet.2024.001
```

파싱 순서:
1. 저자 블록 추출 (연도 괄호 앞까지)
2. 연도 추출 `(YYYY)`
3. 제목 추출 (연도 뒤 ~ 저널명 시작 전)
4. 저널/소스 정보 추출 (이탤릭 힌트 또는 패턴 기반)
5. DOI/URL 추출

### 자동 수정 우선순위

1. **DOI 누락** → CrossRef API로 검색하여 자동 추가
2. **제목 대소문자** → Title Case를 Sentence case로 변환 (고유명사 주의 표시)
3. **페이지 범위** → hyphen을 en dash로 변환
4. **Vol./pp. 접두사** → 자동 제거
5. **DOI 뒤 마침표** → 자동 제거

---

## 리스크 및 완화 방안

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| Citation 파싱 정확도 | 높음 | 정규식 + 폴백 전략, 다양한 형식 테스트 |
| 제목 sentence case 변환 시 고유명사 | 중간 | 자동 변환 후 "고유명사 확인 필요" 경고 표시 |
| CrossRef API 장애/속도 | 낮음 | 캐싱 + API 없이도 기본 검증 동작 |
| 비표준 citation 형식 입력 | 중간 | 파싱 실패 시 명확한 에러 메시지 |

---

## 구현 순서 요약

```
Phase 1 (셋업)     → Phase 2 (파싱)     → Phase 3 (검증 규칙)
                                              ↓
Phase 6 (테스트) ← Phase 5 (프론트엔드) ← Phase 4 (CrossRef 통합)
```

**MVP 범위**: Phase 1-3 + Phase 5 (CrossRef 없이 기본 검증만)
**Full 범위**: Phase 1-6 전체
