<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-13 | Updated: 2026-02-13 -->

# crossref

## Purpose
CrossRef REST API client for searching academic metadata by title, looking up works by DOI, and finding DOIs by title+author matching. Used to enrich parsed citations with accurate metadata.

## Key Files

| File | Description |
|------|-------------|
| `client.ts` | Full CrossRef API client with: `searchByTitle()` (title search, returns top result), `lookupByDOI()` (direct DOI lookup), `findDOI()` (title+author matching with similarity threshold), `parseCrossRefResponse()` (API response to `CrossRefWork` mapping), `normalizeTitle()` / `titleSimilarity()` (Jaccard word overlap for title matching). 10s timeout, polite pool via `mailto` param. |

## For AI Agents

### Working In This Directory
- API base: `https://api.crossref.org`
- Uses polite pool: `mailto=research@example.com` query param
- 10-second timeout via `AbortController`
- Graceful degradation: all functions return `null` on failure
- Title similarity uses Jaccard index on words >3 chars, threshold 0.5

### Testing Requirements
- Test with known DOIs (verify metadata parsing)
- Test with known titles (verify search returns correct work)
- Test timeout behavior (mock slow responses)
- Test rate limit handling (429 responses)
- Test author matching logic (partial name matches)

### Common Patterns
- All async functions wrapped in try/catch returning `null` on error
- `console.warn` for non-critical API errors (rate limits, timeouts)
- Author initials extracted from `given` name field (first char of each word + ".")
- Year extracted from `published-print` or `published-online` date parts
- Exports pure utility functions (`normalizeTitle`, `titleSimilarity`, `parseCrossRefResponse`) for use by validator

## Dependencies

### Internal
- `../types` - `CrossRefWork`, `Author` interfaces

### External
- CrossRef REST API (`https://api.crossref.org/works`)
- `fetch` (global) with `AbortController` for timeout

<!-- MANUAL: -->
