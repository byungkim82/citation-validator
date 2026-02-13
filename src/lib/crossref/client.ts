import { CrossRefWork, Author } from '../types';

const CROSSREF_API_BASE = 'https://api.crossref.org';
const MAILTO = 'research@example.com'; // Generic polite pool email
const USER_AGENT = 'CitationValidator/1.0';
const TIMEOUT_MS = 10000;

interface CrossRefAPIResponse {
  message: {
    items: any[];
  };
}

interface CrossRefWorkResponse {
  message: any;
}

/**
 * Normalize title for comparison
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Calculate simple word overlap similarity between two titles
 */
export function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(' ').filter(w => w.length > 3));
  const wordsB = new Set(normalizeTitle(b).split(' ').filter(w => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Parse a CrossRef API work item into our CrossRefWork type
 */
export function parseCrossRefResponse(item: any): CrossRefWork {
  // Extract authors
  const authors: Author[] = [];
  if (item.author && Array.isArray(item.author)) {
    for (const author of item.author) {
      if (author.family) {
        const initials = author.given
          ? author.given.split(/\s+/).map((n: string) => n.charAt(0) + '.').join(' ')
          : '';
        authors.push({
          lastName: author.family,
          initials
        });
      }
    }
  }

  // Extract year
  let year = '';
  if (item['published-print']?.['date-parts']?.[0]?.[0]) {
    year = String(item['published-print']['date-parts'][0][0]);
  } else if (item['published-online']?.['date-parts']?.[0]?.[0]) {
    year = String(item['published-online']['date-parts'][0][0]);
  }

  // Extract title
  const title = Array.isArray(item.title) ? item.title[0] : item.title || '';

  // Extract source (journal/container)
  const source = Array.isArray(item['container-title'])
    ? item['container-title'][0]
    : item['container-title'] || '';

  // Extract editors
  const editors: Author[] = [];
  if (item.editor && Array.isArray(item.editor)) {
    for (const editor of item.editor) {
      if (editor.family) {
        const initials = editor.given
          ? editor.given.split(/\s+/).map((n: string) => n.charAt(0) + '.').join(' ')
          : '';
        editors.push({
          lastName: editor.family,
          initials
        });
      }
    }
  }

  return {
    doi: item.DOI || '',
    title,
    authors,
    year,
    source,
    volume: item.volume,
    issue: item.issue,
    pages: item.page,
    type: item.type || 'journal-article',
    publisher: item.publisher || undefined,
    editors: editors.length > 0 ? editors : undefined,
    edition: item['edition-number'] || undefined,
  };
}

/**
 * Make a fetch request with timeout
 */
async function fetchWithTimeout(url: string, timeout: number = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Search CrossRef for a work by its title
 */
export async function searchByTitle(title: string): Promise<CrossRefWork | null> {
  try {
    const encodedTitle = encodeURIComponent(title);
    const url = `${CROSSREF_API_BASE}/works?query.title=${encodedTitle}&rows=1&mailto=${MAILTO}`;

    const response = await fetchWithTimeout(url);

    if (response.status === 429) {
      console.warn('CrossRef rate limit exceeded');
      return null;
    }

    if (!response.ok) {
      console.warn(`CrossRef API error: ${response.status}`);
      return null;
    }

    const data: CrossRefAPIResponse = await response.json();

    if (!data.message?.items || data.message.items.length === 0) {
      return null;
    }

    const item = data.message.items[0];
    return parseCrossRefResponse(item);
  } catch (error) {
    console.warn('CrossRef search error:', error);
    return null;
  }
}

/**
 * Look up a specific work by DOI
 */
export async function lookupByDOI(doi: string): Promise<CrossRefWork | null> {
  try {
    // Clean DOI (remove https://doi.org/ prefix if present)
    const cleanDOI = doi.replace(/^https?:\/\/doi\.org\//, '');
    const encodedDOI = encodeURIComponent(cleanDOI);
    const url = `${CROSSREF_API_BASE}/works/${encodedDOI}?mailto=${MAILTO}`;

    const response = await fetchWithTimeout(url);

    if (response.status === 429) {
      console.warn('CrossRef rate limit exceeded');
      return null;
    }

    if (!response.ok) {
      console.warn(`CrossRef API error: ${response.status}`);
      return null;
    }

    const data: CrossRefWorkResponse = await response.json();

    if (!data.message) {
      return null;
    }

    return parseCrossRefResponse(data.message);
  } catch (error) {
    console.warn('CrossRef lookup error:', error);
    return null;
  }
}

/**
 * Find a DOI by title and authors
 * Returns DOI string if confident match found, null otherwise
 */
export async function findDOI(title: string, authors: string[]): Promise<string | null> {
  try {
    // Search by title
    const work = await searchByTitle(title);

    if (!work || !work.doi) {
      return null;
    }

    // Check title similarity
    const similarity = titleSimilarity(title, work.title);
    if (similarity < 0.5) {
      return null; // Not similar enough
    }

    // Verify authors if provided
    if (authors.length > 0 && work.authors.length > 0) {
      // Check if first author's last name matches
      const firstAuthorInput = authors[0].toLowerCase().trim();
      const firstAuthorCrossRef = work.authors[0].lastName.toLowerCase().trim();

      // Allow partial matches (e.g., "Smith" matches "Smith-Jones")
      const authorMatches = firstAuthorInput.includes(firstAuthorCrossRef) ||
                           firstAuthorCrossRef.includes(firstAuthorInput);

      if (!authorMatches) {
        return null; // Author doesn't match
      }
    }

    return work.doi;
  } catch (error) {
    console.warn('FindDOI error:', error);
    return null;
  }
}
