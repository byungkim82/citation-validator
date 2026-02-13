<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# api

## Purpose
Container directory for Next.js App Router API route handlers. All server-side endpoints live here as `route.ts` files in subdirectories.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `validate/` | POST endpoint for citation validation (see `validate/AGENTS.md`) |
| `crossref/` | Reserved for future CrossRef proxy endpoints (currently empty) |

## For AI Agents

### Working In This Directory
- Each API route is a directory containing `route.ts`
- Export named functions matching HTTP methods (`POST`, `GET`, etc.)
- Use `NextRequest`/`NextResponse` from `next/server`
- These run server-side on Cloudflare Workers via OpenNext

### Common Patterns
- JSON request/response with proper error handling
- Input validation at the API boundary
- Try/catch with 500 error responses for unexpected failures

<!-- MANUAL: -->
