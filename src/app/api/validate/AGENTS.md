<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# validate

## Purpose
POST API endpoint that accepts citation text, runs APA 7th Edition validation with optional CrossRef enrichment, and returns structured validation results.

## Key Files

| File | Description |
|------|-------------|
| `route.ts` | Exports `POST` handler. Accepts `{ text: string, useCrossRef?: boolean }` body. Validates input, calls `validateCitations()`, returns `{ results: ValidationResult[] }`. |

## For AI Agents

### Working In This Directory
- Single endpoint: `POST /api/validate`
- Request body: `{ text: string, useCrossRef: boolean }` (useCrossRef defaults to `true`)
- Response: `{ results: ValidationResult[] }` on success, `{ error: string }` on failure
- Returns 400 for missing/invalid text, 500 for internal errors
- CrossRef API calls happen server-side (not exposed to client)

### Testing Requirements
- Test with valid citation text (single and multiple citations)
- Test with empty/missing text (expect 400)
- Test with `useCrossRef: false` for offline-only validation
- Test with malformed JSON body

### Common Patterns
- Input validation before processing
- Delegates all logic to `@/lib/validator`
- No authentication required

## Dependencies

### Internal
- `@/lib/validator` - `validateCitations()` function

### External
- `next/server` - `NextRequest`, `NextResponse`

<!-- MANUAL: -->
