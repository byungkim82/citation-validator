<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# validator

## Purpose
Core APA 7th Edition citation validation engine. Parses raw citation text into structured data, applies 11 validation rules, auto-fixes correctable errors, reconstructs properly formatted citations, and calculates compliance scores. Orchestrates CrossRef integration for metadata enrichment.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Main orchestrator: `validateCitations()` (multiple, with rate limiting + 300ms delay), `validateCitation()` (single, with CrossRef lookup + type correction), `validateCitationWithoutCrossRef()` (sync, offline). Contains `RateLimiter` class (max 3 concurrent), `correctCitationWithCrossRef()` for type/DOI/page correction. Re-exports all public APIs. |
| `parser.ts` | Citation text parser: `parseCitation()` (single text to `ParsedCitation`), `parseCitations()` (splits by double newline). Handles authors (Unicode, prefixes like "van"/"de"), year extraction, DOI/URL extraction, and source type detection (journal/book/chapter/web). Contains `splitByPeriods()` that respects parentheses. |
| `rules.ts` | 11 validation rules exported as `ALL_RULES` array. Each rule is `(ParsedCitation) => ValidationError[]`. Rules: `checkAuthorFormat`, `checkYearFormat`, `checkTitleCase`, `checkJournalNameCase`, `checkConferenceNameCase`, `checkChapterEditors`, `checkDOIPresence`, `checkDOIFormat`, `checkVolumeIssueFormat`, `checkPageFormat`, `checkAmpersand`. Also exports helpers: `toSentenceCase`, `toTitleCase`, `isLikelyTitleCase`. |
| `auto-fix.ts` | Auto-fix engine: `applyAutoFixes()` processes errors and applies corrections (title case, DOI format, volume/issue prefixes, page format, ampersand). `reconstructCitation()` rebuilds APA-formatted string from `ParsedCitation` (handles journal/chapter/book types with italic markers `*`). `calculateScore()` computes 0-100 score (deducts 15/10/5 per error/warning/info, adds back half for auto-fixed). |

## For AI Agents

### Working In This Directory
- `index.ts` is the public entry point; import from `@/lib/validator`
- Validation pipeline: parse -> CrossRef enrich -> rules -> auto-fix -> score
- Rules are pure functions: `(ParsedCitation) => ValidationError[]`
- Auto-fix reads `autoFixable` flag and `suggested` value from errors
- `reconstructCitation()` uses `*text*` for italic markers (journal/book titles)

### Testing Requirements
- Test parser with diverse citation formats: journal, book, chapter, web, proceedings
- Test each rule individually with known-good and known-bad citations
- Test auto-fix produces valid APA 7th output
- Test score calculation: 100 for perfect, deductions for each error type
- Test CrossRef integration: type correction (journal->chapter), DOI addition, page completion
- Test edge cases: 21+ authors (ellipsis format), Unicode names, "doi:" prefix, missing fields

### Common Patterns
- Citation types: `'journal' | 'book' | 'chapter' | 'web' | 'unknown'`
- Parser regex handles: `Vol. X`, `No. Y`, `pp. Z` prefixes (marked as errors by rules)
- Chapter detection: looks for "In " prefix + "(pp. X-Y)" pattern
- En dash (`\u2013`) preferred over hyphen for page ranges
- `crypto.randomUUID()` for result IDs (server-side only)
- Rate limiter: max 3 concurrent CrossRef requests + 300ms delay between citations

### Validation Rules Reference

| Rule | Checks | Auto-fixable |
|------|--------|-------------|
| `checkAuthorFormat` | Initials format "F. M." | Yes (formatting) |
| `checkYearFormat` | 4-digit year | Yes (extraction) |
| `checkTitleCase` | Sentence case (not Title Case) | Yes (conversion) |
| `checkJournalNameCase` | Journal name in Title Case | Yes (conversion) |
| `checkConferenceNameCase` | Conference name in Title Case | Yes (conversion) |
| `checkChapterEditors` | Chapter has editor info | No |
| `checkDOIPresence` | DOI present for journals | No |
| `checkDOIFormat` | `https://doi.org/...` format | Yes (URL conversion) |
| `checkVolumeIssueFormat` | No "Vol."/"No." prefixes | Yes (removal) |
| `checkPageFormat` | No "pp." prefix, en dash | Yes (removal/replacement) |
| `checkAmpersand` | `&` not "and" before last author | Yes (replacement) |

## Dependencies

### Internal
- `../types` - All data interfaces
- `../crossref/client` - `searchByTitle`, `titleSimilarity`

### External
- `crypto` (Node.js) - `randomUUID()`

<!-- MANUAL: -->
