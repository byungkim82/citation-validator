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
    // Extract year - supports multiple APA date formats:
    // (YYYY), (YYYY, Month Day), (YYYY, Month Day-Day), (YYYY, Season),
    // (YYYYa), (n.d.), (in press)
    const yearRegex = /\((n\.d\.|in press|\d{4}[a-z]?(?:,\s*(?:[A-Z][a-z]+(?:\s+\d{1,2}(?:[–-]\d{1,2})?)?))?)\)/;
    const yearMatch = raw.match(yearRegex);
    if (yearMatch) {
      const fullDateStr = yearMatch[1];

      if (fullDateStr === 'n.d.' || fullDateStr === 'in press') {
        citation.year = fullDateStr;
      } else {
        // Extract base year (4 digits)
        const baseYear = fullDateStr.match(/^(\d{4})/);
        if (baseYear) {
          citation.year = baseYear[1];
        }
        // Extract year suffix (e.g., "a" in "2024a")
        const suffixMatch = fullDateStr.match(/^\d{4}([a-z])/);
        if (suffixMatch) {
          citation.yearSuffix = suffixMatch[1];
        }
        // Preserve full date if more than just year (e.g., "2024, March 15")
        if (fullDateStr.includes(',')) {
          citation.fullDate = fullDateStr;
        }
      }

      // Split text into before and after year
      const yearIndex = raw.indexOf(yearMatch[0]);
      const beforeYear = raw.substring(0, yearIndex).trim();
      const afterYear = raw.substring(yearIndex + yearMatch[0].length).trim();

      // Parse authors from text before year
      citation.authors = parseAuthors(beforeYear);

      // Set group author flag on citation if any author is a group author
      if (citation.authors.some(a => a.isGroupAuthor)) {
        citation.isGroupAuthor = true;
      }

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

  // Group/organizational author fallback:
  // If no individual authors matched but the block is non-empty,
  // treat the entire block as a group author name
  if (authors.length === 0 && block.length > 0) {
    // Remove trailing period that separates author block from year
    const groupName = block.replace(/\.\s*$/, '').trim();
    if (groupName.length > 0) {
      authors.push({
        lastName: groupName,
        initials: '',
        isGroupAuthor: true,
      });
    }
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
 * Source segment matching pattern
 */
interface SourcePattern {
  regex: RegExp;
  extract: (match: RegExpMatchArray, citation: ParsedCitation) => void;
}

/**
 * Ordered patterns for matching source segments (checked first-match-wins)
 */
const SOURCE_PATTERNS: SourcePattern[] = [
  // "In Editor (Ed.), BookTitle (pp. X-Y). Publisher"
  {
    regex: /^In\s+(.+?)\s*\((?:Eds?\.|Trans\.)\),?\s*(.+?)\s*\(pp\.\s*([\d–-]+)\)\.\s*(.+)$/i,
    extract: (m, c) => {
      c.source = `In ${m[1]} (Ed.), ${m[2].trim()}`;
      c.pages = m[3].trim();
      c.publisher = m[4].trim().replace(/\.$/, '').split(',')[0].trim();
      c.type = 'chapter';
    },
  },
  // "In SourceName (pp. X-Y). Publisher"
  {
    regex: /^In\s+(.+?)\s*\(pp\.\s*([\d–-]+)\)\.\s*(.+)$/i,
    extract: (m, c) => {
      c.source = `In ${m[1].trim()}`;
      c.pages = m[2].trim();
      c.publisher = m[3].trim().replace(/\.$/, '').split(',')[0].trim();
      c.type = 'chapter';
    },
  },
  // "In SourceName (pp. X-Y)" without publisher
  {
    regex: /^In\s+(.+?)\s*\(pp\.\s*([\d–-]+)\)/i,
    extract: (m, c) => {
      c.source = `In ${m[1].trim()}`;
      c.pages = m[2].trim();
      c.type = 'chapter';
    },
  },
  // Vol. X, No. Y, pp. Z (with prefixes - incorrect format)
  {
    regex: /^(.+?),?\s+Vol\.?\s*(\d+),?\s*No\.?\s*(\d+),?\s*pp\.?\s*([\d–-]+)?/i,
    extract: (m, c) => {
      c.source = m[1].trim();
      c.volume = 'Vol. ' + m[2];
      c.issue = 'No. ' + m[3];
      c.pages = m[4] ? 'pp. ' + m[4] : undefined;
      c.type = 'journal';
    },
  },
  // Vol. X(Y), pp. Z (issue in parentheses, with prefixes)
  {
    regex: /^(.+?),?\s+Vol\.?\s*(\d+)\((\d+)\),?\s*(?:pp\.?\s*)?([\d–-]+)?/i,
    extract: (m, c) => {
      c.source = m[1].trim();
      c.volume = 'Vol. ' + m[2];
      c.issue = m[3];
      c.pages = m[4] ? 'pp. ' + m[4] : undefined;
      c.type = 'journal';
    },
  },
  // Vol. X, pp. Y (no issue, with prefixes)
  {
    regex: /^(.+?),?\s+Vol\.?\s*(\d+),?\s*pp\.?\s*([\d–-]+)?/i,
    extract: (m, c) => {
      c.source = m[1].trim();
      c.volume = 'Vol. ' + m[2];
      c.pages = m[3] ? 'pp. ' + m[3] : undefined;
      c.type = 'journal';
    },
  },
  // volume(issue), pages (correct format)
  {
    regex: /^(.+?),?\s+(\d+)\((\d+)\),?\s*([\d–-]+)?/,
    extract: (m, c) => {
      c.source = m[1].trim();
      c.volume = m[2];
      c.issue = m[3];
      c.pages = m[4];
      c.type = 'journal';
    },
  },
  // volume, pages (no issue, correct format)
  {
    regex: /^(.+?),?\s+(\d+),?\s*([\d–-]+)?/,
    extract: (m, c) => {
      c.source = m[1].trim();
      c.volume = m[2];
      c.pages = m[3];
      c.type = 'journal';
    },
  },
];

/**
 * Parses the text after the year to extract title, source, volume, etc.
 */
function parseRemainingElements(afterYear: string, citation: ParsedCitation): void {
  // Remove leading period and whitespace
  let remaining = afterYear.replace(/^\.\s*/, '').trim();

  // 1. Extract DOI (both full URL and doi: prefix formats)
  const doiUrlMatch = remaining.match(/https?:\/\/(?:dx\.)?doi\.org\/([\w./-]+)/i);
  if (doiUrlMatch) {
    citation.doi = doiUrlMatch[1];
    citation.url = doiUrlMatch[0];
    remaining = remaining.replace(doiUrlMatch[0], '').trim();
  } else {
    const doiPrefixMatch = remaining.match(/doi:\s*(10\.\S+)/i);
    if (doiPrefixMatch) {
      citation.doi = doiPrefixMatch[1].replace(/\.$/, '');
      remaining = remaining.replace(doiPrefixMatch[0], '').trim();
    }
  }

  // Extract URL if no DOI
  if (!citation.doi) {
    const urlMatch = remaining.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      citation.url = urlMatch[1];
      remaining = remaining.replace(urlMatch[0], '').trim();
    }
  }

  // Extract edition pattern from remaining text before segment split
  // This handles "(Nth ed.)" which appears in the title segment for books
  const editionPreMatch = remaining.match(/\((\d+)(?:st|nd|rd|th)\s+ed\.\)/i);
  if (editionPreMatch) {
    citation.edition = editionPreMatch[1];
    remaining = remaining.replace(editionPreMatch[0], '').trim();
  }

  // 2. Extract [BracketType] — used for conference/dissertation detection
  const bracketMatch = remaining.match(/\[(.+?)\]/);
  if (bracketMatch) {
    citation.bracketType = bracketMatch[1];
    remaining = remaining.replace(bracketMatch[0], '').trim();

    const bracketLower = bracketMatch[1].toLowerCase();

    // Conference detection
    if (/paper presentation|poster session|symposium|conference session/.test(bracketLower)) {
      citation.type = 'conference';
    }

    // Dissertation detection
    if (/doctoral dissertation|master'?s thesis/.test(bracketLower)) {
      citation.type = 'dissertation';
      // Extract institution from bracket: "[Doctoral dissertation, MIT]"
      const instMatch = bracketMatch[1].match(/,\s*(.+)$/);
      if (instMatch) {
        citation.institution = instMatch[1].trim();
      }
    }
  }

  // 3. Report No. detection
  const reportNoMatch = remaining.match(/\(Report No\.\s*([^)]+)\)/i);
  if (reportNoMatch) {
    citation.reportNumber = reportNoMatch[1].trim();
    remaining = remaining.replace(reportNoMatch[0], '').trim();
    if (citation.type === 'unknown') {
      citation.type = 'report';
    }
  }

  // 4. Split by periods to get segments
  const segments = splitByPeriods(remaining);

  if (segments.length > 0) {
    citation.title = segments[0].trim();
  }

  if (segments.length > 1) {
    const sourceSegment = segments.slice(1).join('. ').trim();

    // For conference type, remaining after title is conferenceName
    if (citation.type === 'conference') {
      // Clean up trailing/leading punctuation from conference name
      const confName = sourceSegment.replace(/^\.\s*/, '').replace(/\.\s*$/, '').trim();
      if (confName) {
        citation.conferenceName = confName;
      }
      return;
    }

    // For dissertation type, remaining after title is databaseName
    if (citation.type === 'dissertation') {
      const dbName = sourceSegment.replace(/^\.\s*/, '').replace(/\.\s*$/, '').trim();
      if (dbName) {
        citation.databaseName = dbName;
      }
      return;
    }

    // For report type, extract publisher from source segment
    if (citation.type === 'report') {
      const cleanSource = sourceSegment.replace(/\.\s*$/, '').trim();
      if (cleanSource) {
        citation.publisher = cleanSource;
        citation.source = cleanSource;
      }
      return;
    }

    // Try source patterns in order (first match wins)
    for (const pattern of SOURCE_PATTERNS) {
      const match = sourceSegment.match(pattern.regex);
      if (match) {
        pattern.extract(match, citation);
        return;
      }
    }

    // Book detection: edition pattern "(Nth ed.)" in source segment or already extracted
    const editionMatch = sourceSegment.match(/\((\d+)(?:st|nd|rd|th)\s+ed\.\)/i);
    if (editionMatch) {
      citation.edition = editionMatch[1];
    }

    // Enhanced book detection: check for edition (in segment or pre-extracted), Press, Publisher, Books keywords
    const hasEdition = !!editionMatch || !!citation.edition;
    const hasBookKeyword = /Press|Publisher|Books/.test(sourceSegment);

    if (hasEdition || hasBookKeyword) {
      // Extract publisher: text after edition or after last period
      let bookSource = sourceSegment;
      if (editionMatch) {
        // Title (Nth ed.). Publisher — edition still in sourceSegment
        const edFullMatch = sourceSegment.match(/^(.+?)\s*\(\d+(?:st|nd|rd|th)\s+ed\.\)\.\s*(.+?)\.?\s*$/i);
        if (edFullMatch) {
          bookSource = edFullMatch[1].trim();
          citation.publisher = edFullMatch[2].trim().replace(/\.$/, '');
        }
      } else if (citation.edition && !editionMatch) {
        // Edition already pre-extracted; sourceSegment is just publisher or "title. publisher"
        const pubMatch = sourceSegment.match(/^(.+?)\.?\s*$/);
        if (pubMatch) {
          const cleaned = pubMatch[1].trim().replace(/\.$/, '');
          citation.publisher = cleaned;
          // Use the title as book source (already in citation.title)
          bookSource = citation.title;
        }
      } else {
        // Simple: look for last period-separated segment as publisher
        const bookMatch = sourceSegment.match(/^(.+?)\.\s*(.+?)\.?\s*$/);
        if (bookMatch) {
          bookSource = bookMatch[1].trim();
          citation.publisher = bookMatch[2].trim().replace(/\.$/, '');
        }
      }
      citation.source = bookSource;
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

  // Final fallback: if we have a URL but no DOI and type is still unknown, it's web
  if (citation.type === 'unknown' && citation.url && !citation.doi) {
    citation.type = 'web';
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
