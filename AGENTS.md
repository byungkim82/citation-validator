<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# citation-validator

## Purpose
A Next.js 15 web application that validates APA 7th Edition citations copied from Google Scholar. It parses citation text, checks formatting rules, auto-fixes common errors, and optionally enriches data via the CrossRef API (DOI lookup, page completion, type correction). The UI is in Korean.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Dependencies: Next.js 15, React 19, Tailwind CSS 4, OpenNext/Cloudflare |
| `next.config.ts` | Next.js config with OpenNext Cloudflare dev init |
| `open-next.config.ts` | OpenNext Cloudflare deployment config |
| `wrangler.jsonc` | Cloudflare Workers config (name, compatibility, assets) |
| `tsconfig.json` | TypeScript strict mode, `@/*` path alias to `./src/*` |
| `postcss.config.mjs` | PostCSS with `@tailwindcss/postcss` plugin |
| `LICENSE` | Project license |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Application source code (see `src/AGENTS.md`) |
| `public/` | Static assets and Cloudflare `_headers` file |

## For AI Agents

### Working In This Directory
- Use `npm run dev` for local development
- Use `npm run preview` to test Cloudflare deployment locally
- Use `npm run deploy` for production deployment to Cloudflare
- Path alias `@/*` maps to `./src/*` in all imports
- Tailwind CSS v4 is used (import-based, no `tailwind.config.js`)

### Testing Requirements
- Run `npm run build` to verify no TypeScript or build errors
- Run `npm run lint` for ESLint checks
- No test framework is configured yet

### Common Patterns
- Korean UI text throughout (e.g., "검증하기", "참고문헌")
- Client components use `'use client'` directive
- API routes in `src/app/api/` use Next.js App Router conventions
- All types defined centrally in `src/lib/types.ts`

### Architecture Overview
```
User Input → CitationInput → /api/validate (POST)
  → parseCitations() → validation rules → auto-fix → CrossRef enrichment
  → ValidationResult[] → ValidationResults → CitationCard
```

## Dependencies

### External
- `next` 15.x - App Router framework
- `react` / `react-dom` 19.x - UI library
- `@opennextjs/cloudflare` - Cloudflare Workers deployment adapter
- `tailwindcss` 4.x - Utility-first CSS (v4, PostCSS plugin)
- `typescript` 5.x - Type safety with strict mode
- `wrangler` 4.x - Cloudflare Workers CLI (dev dependency)

### Runtime APIs
- CrossRef REST API (`https://api.crossref.org`) - DOI lookup and metadata enrichment
- `crypto.randomUUID()` - Unique result IDs

<!-- MANUAL: -->
