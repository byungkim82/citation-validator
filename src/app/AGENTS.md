<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# app

## Purpose
Next.js App Router directory containing the root layout, main page, global styles, and API route handlers. Serves as the entry point for both the web UI and the server-side validation API.

## Key Files

| File | Description |
|------|-------------|
| `layout.tsx` | Root layout: HTML lang="ko", metadata (title: "APA Citation Checker"), body with Tailwind base classes |
| `page.tsx` | Main page (client component): composes CitationInput + ValidationResults using useCitationValidator hook |
| `globals.css` | Global CSS: single `@import "tailwindcss"` (Tailwind v4 style) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `api/` | Server-side API route handlers (see `api/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `layout.tsx` is a server component (no `'use client'`)
- `page.tsx` is a client component (`'use client'` directive)
- `globals.css` uses Tailwind v4 import syntax, not v3 `@tailwind` directives
- Metadata is set via the `metadata` export in `layout.tsx`

### Testing Requirements
- Verify page renders with `npm run dev`
- Check that layout metadata appears correctly in browser tab

### Common Patterns
- Page composes components and hooks, contains no direct business logic
- Korean text for all user-facing strings
- Tailwind utility classes for all styling (no CSS modules)

## Dependencies

### Internal
- `@/components/CitationInput` - Text input form
- `@/components/ValidationResults` - Results display
- `@/hooks/useCitationValidator` - Validation state management

<!-- MANUAL: -->
