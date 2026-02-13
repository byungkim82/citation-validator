<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# src

## Purpose
Contains all application source code: Next.js App Router pages and API routes, React components, custom hooks, and core validation/CrossRef library code.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router: pages, layouts, API routes (see `app/AGENTS.md`) |
| `components/` | React UI components for citation input and result display (see `components/AGENTS.md`) |
| `hooks/` | Custom React hooks for client-side state management (see `hooks/AGENTS.md`) |
| `lib/` | Core business logic: types, citation parser, validation rules, auto-fix, CrossRef client (see `lib/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- All imports use `@/*` path alias (e.g., `@/lib/types`, `@/components/CitationCard`)
- Client components require `'use client'` directive at top of file
- Server-side code (API routes, lib/) can use Node.js APIs like `crypto`
- No barrel exports at `src/` level; import from specific subdirectories

### Common Patterns
- Types are centralized in `lib/types.ts` and imported throughout
- Components are default-exported, one per file
- Hooks follow `use*` naming convention
- API routes export named HTTP method handlers (e.g., `POST`)

## Dependencies

### Internal
- `app/` depends on `components/`, `hooks/`, `lib/`
- `components/` depends on `lib/types`
- `hooks/` depends on `lib/types`
- `lib/validator/` depends on `lib/crossref/` and `lib/types`

<!-- MANUAL: -->
