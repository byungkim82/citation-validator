<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# lib

## Purpose
Core business logic layer: shared TypeScript types, citation parsing, APA 7th Edition validation rules, auto-fix engine, and CrossRef API client for metadata enrichment.

## Key Files

| File | Description |
|------|-------------|
| `types.ts` | All shared TypeScript interfaces: `Author`, `ParsedCitation`, `ValidationError`, `AutoFix`, `ManualFix`, `ValidationResult`, `CrossRefWork`. Central type authority for the entire app. |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `crossref/` | CrossRef REST API client for DOI lookup and metadata retrieval (see `crossref/AGENTS.md`) |
| `validator/` | Citation parser, APA rules, auto-fix engine, and orchestrator (see `validator/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `types.ts` is the single source of truth for all data structures
- When adding new fields, update `types.ts` first, then consumers
- Server-side only code (uses `crypto.randomUUID()` in validator)
- No client-side imports allowed (no `'use client'`)

### Testing Requirements
- Type changes should be validated with `npm run build` (TypeScript strict mode)
- Validate parsing with diverse citation formats (journal, book, chapter, web)
- Test CrossRef integration with known DOIs

### Common Patterns
- Functional programming: pure functions for parsing and validation rules
- Validation rules are `(ParsedCitation) => ValidationError[]` functions
- Auto-fix maps validation errors to corrected citation fields
- CrossRef client returns `null` on failure (graceful degradation)

## Dependencies

### Internal
- `crossref/` depends on `types.ts`
- `validator/` depends on `types.ts` and `crossref/`

### External
- `crypto` (Node.js built-in) - UUID generation
- CrossRef REST API - External HTTP dependency

<!-- MANUAL: -->
