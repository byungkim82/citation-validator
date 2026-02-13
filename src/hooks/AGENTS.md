<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# hooks

## Purpose
Custom React hooks for managing client-side application state, primarily the citation validation workflow.

## Key Files

| File | Description |
|------|-------------|
| `useCitationValidator.ts` | Main hook: manages `results`, `isLoading`, `error` state. Provides `validate(text, useCrossRef?)` that POSTs to `/api/validate` and `clear()` to reset. Returns `UseCitationValidatorReturn` interface. |

## For AI Agents

### Working In This Directory
- Hooks use `'use client'` directive
- Follow React hook naming convention (`use*`)
- Single hook pattern: one hook per feature/workflow
- Error handling: catches fetch errors and exposes via `error` state

### Testing Requirements
- Test loading state transitions (idle -> loading -> success/error)
- Test error handling for failed API calls
- Test clear function resets all state

### Common Patterns
- `useCallback` for stable function references
- Async operations with try/catch/finally for loading state
- API calls use `fetch` with JSON body, not a dedicated HTTP client

## Dependencies

### Internal
- `@/lib/types` - `ValidationResult` type
- `/api/validate` - Server-side validation endpoint (runtime dependency)

### External
- `react` - useState, useCallback

<!-- MANUAL: -->
