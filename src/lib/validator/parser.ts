import { ParsedCitation, Author } from '../types';

/**
 * Parses a single APA citation string into structured data
 */
export function parseCitation(text: string): ParsedCitation {
  const raw = text.trim();

  // Initialize default citation
  const citation: ParsedCitation = {
    raw,
    authors: [],
    year: '',
    title: '',
    source: '',
    type: 'unknown'
  };

  try {
    // Extract year - pattern: (YYYY) or (YYYY, Month Day)
    const yearMatch = raw.match(/\((\d{4})(?:,\s*[A-Z][a-z]+\s+\d{1,2})?\)/);
    if (yearMatch) {
      citation.year = yearMatch[1];

      // Split text into before and after year
      const yearIndex = raw.indexOf(yearMatch[0]);
      const beforeYear = raw.substring(0, yearIndex).trim();
      const afterYear = raw.substring(yearIndex + yearMatch[0].length).trim();

      // Parse authors from text before year
      citation.authors = parseAuthors(beforeYear);

      // Parse remaining citation elements from text after year
      parseRemainingElements(afterYear, citation);
    } else {
      // No year found - try to extract what we can
      citation.title = raw;
    }
  } catch (error) {
    console.error('Error parsing citation:', error);
    citation.title = raw; // Fallback
  }

  return citation;
}

/**
 * Parses multiple citations separated by double newlines
 */
export function parseCitations(text: string): ParsedCitation[] {
  // Split by double newline (or more)
  const citationTexts = text.split(/\n\s*\n/);

  return citationTexts
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .map(parseCitation);
}

/**
 * Parses author block into structured Author objects
 */
function parseAuthors(authorBlock: string): Author[] {
  const authors: Author[] = [];

  // Trim whitespace but DON'T remove trailing period (it might be part of initials)
  let block = authorBlock.trim();

  // Normalize Unicode quotation marks/apostrophes to ASCII apostrophe
  block = block.replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g, "'");

  // Handle et al. placeholder
  if (block.includes('et al.') || block.includes('...')) {
    // Extract what we can before et al./...
    block = block.replace(/,?\s*(?:et al\.|\.\.\.)\s*$/, '');
  }

  // Split by " & " first to separate the last author
  const parts = block.split(/\s*&\s*/);

  // Character class for last names: letters (including accented), apostrophes, hyphens
  const nameChars = "[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F'\\-]+";
  const prefixes = "(?:\\s+(?:van|de|von|la|del|di|el|al|bin|ibn)\\s+" + nameChars + ")?";
  const initialsPattern = "((?:[A-Z]\\.\\s*)+)";

  const authorRegex = new RegExp(
    "(" + nameChars + prefixes + "),\\s*" + initialsPattern,
    "g"
  );

  // Process each part (before & and after &)
  for (const part of parts) {
    let match;

    while ((match = authorRegex.exec(part)) !== null) {
      const lastName = match[1].trim();
      const initials = match[2].trim();

      authors.push({
        lastName,
        initials: normalizeInitials(initials)
      });
    }
    // Reset regex lastIndex for next part
    authorRegex.lastIndex = 0;
  }

  return authors;
}

/**
 * Normalizes initials to consistent format (e.g., "F. M.")
 */
function normalizeInitials(initials: string): string {
  // Extract all capital letters
  const letters = initials.match(/[A-Z]/g) || [];
  // Join with ". " and add trailing period
  return letters.map(l => `${l}.`).join(' ');
}

/**
 * Parses the text after the year to extract title, source, volume, etc.
 */
function parseRemainingElements(afterYear: string, citation: ParsedCitation): void {
  // Remove leading period and whitespace
  let remaining = afterYear.replace(/^\.\s*/, '').trim();

  // Try to extract DOI first (both full URL and doi: prefix formats)
  const doiUrlMatch = remaining.match(/https?:\/\/(?:dx\.)?doi\.org\/([\w./-]+)/i);
  if (doiUrlMatch) {
    citation.doi = doiUrlMatch[1];
    citation.url = doiUrlMatch[0];
    remaining = remaining.replace(doiUrlMatch[0], '').trim();
  } else {
    // Try to match doi: prefix format (e.g., "doi:10.1234/xyz")
    const doiPrefixMatch = remaining.match(/doi:\s*(10\.\S+)/i);
    if (doiPrefixMatch) {
      citation.doi = doiPrefixMatch[1].replace(/\.$/, ''); // Remove trailing period if present
      remaining = remaining.replace(doiPrefixMatch[0], '').trim();
    }
  }

  // Try to extract URL if no DOI
  if (!citation.doi) {
    const urlMatch = remaining.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      citation.url = urlMatch[1];
      citation.type = 'web';
      remaining = remaining.replace(urlMatch[0], '').trim();
    }
  }

  // Split by periods to get potential title and source
  // Use a smarter split that doesn't break on periods inside parentheses like (pp. 20-31)
  const segments = splitByPeriods(remaining);

  if (segments.length > 0) {
    citation.title = segments[0].trim();
  }

  if (segments.length > 1) {
    // The next segment likely contains source and possibly volume/issue/pages
    const sourceSegment = segments.slice(1).join('. ').trim();

    // === CONFERENCE PROCEEDING / BOOK CHAPTER DETECTION ===
    // Pattern: "In SourceName (pp. X-Y). Publisher, Location"
    // Must check BEFORE journal patterns to avoid misclassification
    const chapterMatch = sourceSegment.match(
      /^In\s+(.+?)\s*\(pp\.\s*([\d–-]+)\)\.\s*(.+)$/i
    );
    if (chapterMatch) {
      citation.source = `In ${chapterMatch[1].trim()}`;
      citation.pages = chapterMatch[2].trim();
      // Publisher info (e.g., "Springer, Berlin, Heidelberg")
      // APA 7th: publisher name required, location not required
      const publisherInfo = chapterMatch[3].trim().replace(/\.$/, '');
      citation.publisher = publisherInfo.split(',')[0].trim();
      citation.type = 'chapter';
      return;
    }

    // Also match: "In EditorName (Ed.), BookTitle (pp. X-Y). Publisher"
    const editedChapterMatch = sourceSegment.match(
      /^In\s+(.+?)\s*\((?:Eds?\.|Trans\.)\),?\s*(.+?)\s*\(pp\.\s*([\d–-]+)\)\.\s*(.+)$/i
    );
    if (editedChapterMatch) {
      citation.source = `In ${editedChapterMatch[1]} (Ed.), ${editedChapterMatch[2].trim()}`;
      citation.pages = editedChapterMatch[3].trim();
      const publisherInfo = editedChapterMatch[4].trim().replace(/\.$/, '');
      citation.publisher = publisherInfo.split(',')[0].trim();
      citation.type = 'chapter';
      return;
    }

    // Simple "In SourceName (pp. X-Y)" without publisher
    const simpleChapterMatch = sourceSegment.match(
      /^In\s+(.+?)\s*\(pp\.\s*([\d–-]+)\)/i
    );
    if (simpleChapterMatch) {
      citation.source = `In ${simpleChapterMatch[1].trim()}`;
      citation.pages = simpleChapterMatch[2].trim();
      citation.type = 'chapter';
      return;
    }

    // === JOURNAL ARTICLE PATTERNS ===

    // Look for Vol. X, No. Y, pp. Z pattern (with prefixes - incorrect format)
    const volNoMatch = sourceSegment.match(/^(.+?),?\s+Vol\.?\s*(\d+),?\s*No\.?\s*(\d+),?\s*pp\.?\s*([\d–-]+)?/i);
    if (volNoMatch) {
      citation.source = volNoMatch[1].trim();
      citation.volume = 'Vol. ' + volNoMatch[2];
      citation.issue = 'No. ' + volNoMatch[3];
      citation.pages = volNoMatch[4] ? 'pp. ' + volNoMatch[4] : undefined;
      citation.type = 'journal';
      return;
    }

    // Look for Vol. X(Y), pp. Z pattern (issue in parentheses, with prefixes)
    const volIssueParenMatch = sourceSegment.match(/^(.+?),?\s+Vol\.?\s*(\d+)\((\d+)\),?\s*(?:pp\.?\s*)?([\d–-]+)?/i);
    if (volIssueParenMatch) {
      citation.source = volIssueParenMatch[1].trim();
      citation.volume = 'Vol. ' + volIssueParenMatch[2];
      citation.issue = volIssueParenMatch[3];
      citation.pages = volIssueParenMatch[4] ? 'pp. ' + volIssueParenMatch[4] : undefined;
      citation.type = 'journal';
      return;
    }

    // Look for Vol. X, pp. Y pattern (no issue, with prefixes)
    const volPpMatch = sourceSegment.match(/^(.+?),?\s+Vol\.?\s*(\d+),?\s*pp\.?\s*([\d–-]+)?/i);
    if (volPpMatch) {
      citation.source = volPpMatch[1].trim();
      citation.volume = 'Vol. ' + volPpMatch[2];
      citation.pages = volPpMatch[3] ? 'pp. ' + volPpMatch[3] : undefined;
      citation.type = 'journal';
      return;
    }

    // Look for volume(issue), pages pattern - typical of journal articles (correct format)
    const journalMatch = sourceSegment.match(/^(.+?),?\s+(\d+)\((\d+)\),?\s*([\d–-]+)?/);
    if (journalMatch) {
      citation.source = journalMatch[1].trim();
      citation.volume = journalMatch[2];
      citation.issue = journalMatch[3];
      citation.pages = journalMatch[4];
      citation.type = 'journal';
      return;
    }

    // Look for volume, pages pattern (no issue, correct format)
    const volumeMatch = sourceSegment.match(/^(.+?),?\s+(\d+),?\s*([\d–-]+)?/);
    if (volumeMatch) {
      citation.source = volumeMatch[1].trim();
      citation.volume = volumeMatch[2];
      citation.pages = volumeMatch[3];
      citation.type = 'journal';
      return;
    }

    // Look for publisher and location pattern (books)
    const bookMatch = sourceSegment.match(/^(.+?)(?:\.\s*(.+?))$/);
    if (bookMatch && (sourceSegment.includes('Press') || sourceSegment.includes('Publisher') || sourceSegment.includes('Books'))) {
      citation.source = sourceSegment.trim();
      citation.type = 'book';
      return;
    }

    // Default: treat as source
    citation.source = sourceSegment.trim();

    // Determine type based on what we extracted
    if (citation.volume || citation.issue) {
      citation.type = 'journal';
    } else if (citation.url && !citation.doi) {
      citation.type = 'web';
    }
  }
}

/**
 * Splits text by ". " but preserves periods inside parentheses like (pp. 20-31)
 */
function splitByPeriods(text: string): string[] {
  const segments: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '(') {
      parenDepth++;
      current += char;
    } else if (char === ')') {
      parenDepth--;
      current += char;
    } else if (char === '.' && parenDepth === 0 && i + 1 < text.length && text[i + 1] === ' ') {
      // Period followed by space outside parentheses = segment boundary
      segments.push(current.trim());
      current = '';
      i++; // skip the space
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}
