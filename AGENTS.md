<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# citation-validator

## Purpose
A Next.js 15 web application that validates APA 7th Edition citations copied from Google Scholar. It parses citation text, checks formatting rules (sections 10.1-10.6), auto-fixes common errors, and optionally enriches data via the CrossRef API (DOI lookup, page completion, type correction). The UI is in Korean.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 4 (PostCSS plugin, no config file)
- **Testing**: Vitest 4
- **Linting**: ESLint 9 (next/core-web-vitals)
- **Deployment**: Cloudflare Workers via OpenNext + Wrangler 4
- **CI**: GitHub Actions (lint → type check → test → deploy on push to main)
- **Node**: 22 (`.nvmrc`)

## Architecture

```
User Input → CitationInput → /api/validate (POST)
  → parseCitations() → type-routed validation rules → auto-fix → CrossRef enrichment
  → ValidationResult[] → ValidationResults → CitationCard
```

### Data Flow
1. User pastes citation text into `CitationInput` component
2. `useCitationValidator` hook sends POST to `/api/validate`
3. API route calls `validateCitations()` which:
   a. `parseCitation()` — regex-based parser extracts authors, year, title, source, volume/issue/pages, DOI, etc.
   b. `getRulesForType()` — selects applicable rules based on detected citation type
   c. `applyAutoFixes()` — applies fixable errors, generates manual fix hints
   d. CrossRef lookup (optional) — enriches with DOI, page ranges, type correction
   e. `calculateScore()` — 0-100 compliance score
4. Results rendered as expandable `CitationCard` components with original/fixed text, auto-fix log, and manual fix hints

### Supported Citation Types
`journal` | `book` | `chapter` | `conference` | `dissertation` | `report` | `web` | `unknown`

## Key Files

| File | Description |
|------|-------------|
| `src/app/page.tsx` | Main page (client component), wires up input/results |
| `src/app/layout.tsx` | Root layout, Korean lang, metadata |
| `src/app/api/validate/route.ts` | POST endpoint, calls `validateCitations()` |
| `src/hooks/useCitationValidator.ts` | React hook: fetch → loading/error/results state |
| `src/components/CitationInput.tsx` | Textarea input with CrossRef toggle, example button |
| `src/components/ValidationResults.tsx` | Summary bar + list of CitationCards + copy-all button |
| `src/components/CitationCard.tsx` | Expandable card: original, fixed, auto-fixes, manual fixes, score |
| `src/lib/clipboard.ts` | `copyToClipboard()` with fallback for older browsers |
| `src/lib/types.ts` | All shared types: `ParsedCitation`, `ValidationResult`, `ValidationError`, `AutoFix`, `ManualFix`, `CrossRefWork`, `Author` |
| `src/lib/validator/parser.ts` | Regex-based citation parser: authors, year, title, source patterns |
| `src/lib/validator/rules.ts` | 22 validation rules with type-based routing system |
| `src/lib/validator/auto-fix.ts` | Auto-fix engine, citation reconstruction, score calculation |
| `src/lib/validator/index.ts` | Orchestrator: parse → validate → CrossRef enrich → assemble result |
| `src/lib/crossref/client.ts` | CrossRef API client: search by title, lookup by DOI, title similarity |
| `vitest.config.ts` | Vitest config with `@/` path alias |
| `eslint.config.mjs` | ESLint flat config (next/core-web-vitals) |
| `wrangler.jsonc` | Cloudflare Workers config |
| `.github/workflows/deploy.yml` | CI/CD: lint + typecheck + test → build + deploy |
| `docs/crossref-api-reference.md` | CrossRef API reference documentation |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/app/` | Next.js App Router pages and API routes |
| `src/components/` | React UI components (CitationInput, ValidationResults, CitationCard) |
| `src/hooks/` | Custom React hooks (useCitationValidator) |
| `src/lib/` | Core logic: types, validator engine, CrossRef client |
| `src/lib/validator/` | Parser, rules, auto-fix, orchestrator |
| `src/lib/validator/__tests__/` | Unit tests: parser, rules, auto-fix, integration |
| `src/lib/crossref/` | CrossRef API client |
| `src/lib/crossref/__tests__/` | CrossRef client unit tests |
| `public/` | Static assets and Cloudflare `_headers` file |
| `docs/` | Reference documentation |
| `.github/workflows/` | CI/CD pipeline |

## For AI Agents

### Commands
- `npm run dev` — local development server
- `npm run build` — production build (verifies TypeScript + Next.js)
- `npm run lint` — ESLint checks
- `npm test` — run Vitest tests
- `npm run test:watch` — Vitest in watch mode
- `npm run preview` — test Cloudflare deployment locally
- `npm run deploy` — deploy to Cloudflare Workers

### Conventions
- Path alias `@/*` → `./src/*` in all imports
- Tailwind CSS v4 (import-based, no `tailwind.config.js`)
- Korean UI text throughout (e.g., "검증하기", "참고문헌", "자동수정")
- Client components use `'use client'` directive
- API routes use Next.js App Router conventions (`route.ts` with named exports)
- All types defined centrally in `src/lib/types.ts`
- Validation rules use a routing system: each rule declares which citation types it applies to via `ROUTED_RULES`
- Auto-fix uses a data-driven `FIELD_MAP` + `FIX_DESCRIPTIONS` pattern for most rules
- CrossRef API requests use rate limiting (max 3 concurrent) and polite pool (`mailto` param)

### Validation Rules (22 total)
**Universal**: authorFormat, yearFormat, titleCase, doiFormat, ampersand, terminalPeriod
**Journal**: doiPresence, volumeFormat, issueFormat, journalNameCase, pageFormat
**Chapter**: conferenceNameCase, chapterEditors, inPrefix, pageFormat, editionFormat, publisherLocation
**Book**: publisherRequired, editionFormat, publisherLocation
**Conference**: fullDateRequired, conferenceInfo, bracketType
**Dissertation**: dissertationInfo, bracketType
**Report**: reportNumber, publisherRequired

### Testing
- Tests live alongside source in `__tests__/` directories
- Vitest with globals enabled (no explicit imports needed)
- Test files: `parser.test.ts`, `rules.test.ts`, `auto-fix.test.ts`, `integration.test.ts`, `client.test.ts`

### Adding a New Validation Rule
1. Add rule function in `src/lib/validator/rules.ts` following existing pattern
2. Add entry to `ROUTED_RULES` array with `appliesTo` types
3. If auto-fixable, add field mapping in `auto-fix.ts` `FIELD_MAP` and description in `FIX_DESCRIPTIONS`
4. Add manual fix hint in `MANUAL_FIX_HINTS` if not auto-fixable
5. Add tests in `src/lib/validator/__tests__/rules.test.ts`

### Adding a New Citation Type
1. Add type to `ParsedCitation['type']` union in `src/lib/types.ts`
2. Add parsing logic in `parser.ts` `parseRemainingElements()`
3. Add reconstruction logic in `auto-fix.ts` `reconstructCitation()`
4. Add type mapping in `index.ts` `mapCrossRefType()`
5. Route existing/new rules to the type in `ROUTED_RULES`

## Dependencies

### Runtime
- `next` 15.x — App Router framework
- `react` / `react-dom` 19.x — UI library
- `@opennextjs/cloudflare` — Cloudflare Workers deployment adapter

### Dev
- `tailwindcss` 4.x / `@tailwindcss/postcss` — Utility-first CSS
- `typescript` 5.x — Type safety (strict mode)
- `vitest` 4.x / `@vitejs/plugin-react` — Unit testing
- `eslint` 9.x / `eslint-config-next` — Linting
- `wrangler` 4.x — Cloudflare Workers CLI

### External APIs
- CrossRef REST API (`https://api.crossref.org`) — DOI lookup, metadata enrichment, type verification
- `crypto.randomUUID()` — Unique result IDs

<!-- MANUAL: -->
