import { ParsedCitation, ValidationError, AutoFix, ManualFix, Author } from '../types';
import { toSentenceCase, toTitleCase } from './rules';

/**
 * Convert a number string to ordinal format (1→1st, 2→2nd, 3→3rd, etc.)
 */
function toOrdinal(n: string): string {
  const num = parseInt(n, 10);
  if (isNaN(num)) return n;
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const mod100 = num % 100;
  const suffix = suffixes[(mod100 - 20) % 10] || suffixes[mod100] || suffixes[0];
  return `${num}${suffix}`;
}

/**
 * Apply all auto-fixable corrections to a citation
 */
export function applyAutoFixes(
  citation: ParsedCitation,
  errors: ValidationError[]
): {
  fixedCitation: string;
  autoFixes: AutoFix[];
  manualFixes: ManualFix[];
} {
  const autoFixes: AutoFix[] = [];
  const manualFixes: ManualFix[] = [];

  // Create a working copy of the citation
  const fixedCitation: ParsedCitation = {
    ...citation,
    authors: citation.authors.map(a => ({ ...a })),
  };

  // Apply fixes based on errors
  for (const error of errors) {
    if (!error.autoFixable) {
      // Create manual fix entry
      manualFixes.push({
        rule: error.rule,
        field: error.field,
        message: error.message,
        hint: getManualFixHint(error),
      });
      continue;
    }

    // Apply auto-fixable corrections
    switch (error.rule) {
      case 'authorFormat':
        if (error.suggested && error.field === 'authors') {
          // Find and fix the specific author
          const authorIndex = parseInt(error.message.match(/Author (\d+)/)?.[1] || '0') - 1;
          if (authorIndex >= 0 && authorIndex < fixedCitation.authors.length) {
            const oldInitials = fixedCitation.authors[authorIndex].initials;
            fixedCitation.authors[authorIndex].initials = error.suggested;
            autoFixes.push({
              rule: 'authorFormat',
              field: 'authors',
              original: oldInitials,
              fixed: error.suggested,
              description: `Corrected initials format to "${error.suggested}"`,
            });
          }
        }
        break;

      case 'yearFormat':
        if (error.suggested) {
          const oldYear = fixedCitation.year;
          fixedCitation.year = error.suggested;
          autoFixes.push({
            rule: 'yearFormat',
            field: 'year',
            original: oldYear,
            fixed: error.suggested,
            description: `Corrected year format to "${error.suggested}"`,
          });
        }
        break;

      case 'titleCase':
        if (error.suggested) {
          const oldTitle = fixedCitation.title;
          fixedCitation.title = error.suggested;
          autoFixes.push({
            rule: 'titleCase',
            field: 'title',
            original: oldTitle,
            fixed: error.suggested,
            description: 'Converted title to sentence case (verify proper nouns)',
          });
        }
        break;

      case 'doiFormat':
        if (error.suggested) {
          const oldDOI = fixedCitation.doi || '';
          fixedCitation.doi = error.suggested;
          autoFixes.push({
            rule: 'doiFormat',
            field: 'doi',
            original: oldDOI,
            fixed: error.suggested,
            description: `Corrected DOI format to "${error.suggested}"`,
          });
        }
        break;

      case 'volumeFormat':
        if (error.suggested) {
          const oldVolume = fixedCitation.volume || '';
          fixedCitation.volume = error.suggested;
          autoFixes.push({
            rule: 'volumeFormat',
            field: 'volume',
            original: oldVolume,
            fixed: error.suggested,
            description: 'Removed "Vol." prefix from volume',
          });
        }
        break;

      case 'issueFormat':
        if (error.suggested) {
          const oldIssue = fixedCitation.issue || '';
          fixedCitation.issue = error.suggested;
          autoFixes.push({
            rule: 'issueFormat',
            field: 'issue',
            original: oldIssue,
            fixed: error.suggested,
            description: 'Removed "No." prefix from issue',
          });
        }
        break;

      case 'pageFormat':
        if (error.suggested) {
          const oldPages = fixedCitation.pages || '';
          fixedCitation.pages = error.suggested;
          autoFixes.push({
            rule: 'pageFormat',
            field: 'pages',
            original: oldPages,
            fixed: error.suggested,
            description: error.message.includes('pp.')
              ? 'Removed "pp." prefix'
              : 'Changed hyphen to en dash',
          });
        }
        break;

      case 'journalNameCase':
        if (error.suggested) {
          const oldSource = fixedCitation.source;
          fixedCitation.source = error.suggested;
          autoFixes.push({
            rule: 'journalNameCase',
            field: 'source',
            original: oldSource,
            fixed: error.suggested,
            description: 'Converted journal name to Title Case',
          });
        }
        break;

      case 'conferenceNameCase':
        if (error.suggested) {
          const oldSource = fixedCitation.source;
          fixedCitation.source = error.suggested;
          autoFixes.push({
            rule: 'conferenceNameCase',
            field: 'source',
            original: oldSource,
            fixed: error.suggested,
            description: 'Converted conference/proceedings name to Title Case',
          });
        }
        break;

      case 'ampersand':
        // This is handled during reconstruction
        autoFixes.push({
          rule: 'ampersand',
          field: 'authors',
          original: 'and',
          fixed: '&',
          description: 'Changed "and" to "&" before last author',
        });
        break;
    }
  }

  // Reconstruct the citation with fixes applied
  const fixedCitationString = reconstructCitation(fixedCitation);

  return {
    fixedCitation: fixedCitationString,
    autoFixes,
    manualFixes,
  };
}

/**
 * Reconstruct a properly formatted APA 7th citation from parsed fields
 */
export function reconstructCitation(citation: ParsedCitation): string {
  const parts: string[] = [];

  // Authors
  if (citation.authors.length > 0) {
    const authorStrings = citation.authors.map((author, index) => {
      if (citation.authors.length > 20 && index === 19) {
        // Ellipsis case for 21+ authors
        return '...';
      }
      if (citation.authors.length > 20 && index > 19 && index < citation.authors.length - 1) {
        return null; // Skip middle authors
      }
      return `${author.lastName}, ${author.initials}`;
    }).filter(Boolean);

    // Join authors with commas and &
    let authorsString: string;
    if (authorStrings.length === 1) {
      authorsString = authorStrings[0] as string;
    } else if (authorStrings.length === 2) {
      authorsString = authorStrings[0] + ', & ' + authorStrings[1];
    } else {
      const lastAuthor = authorStrings[authorStrings.length - 1];
      const restAuthors = authorStrings.slice(0, -1);
      authorsString = restAuthors.join(', ') + ', & ' + lastAuthor;
    }

    parts.push(authorsString);
  }

  // Year
  if (citation.year) {
    parts.push(`(${citation.year}).`);
  }

  // Title
  if (citation.title) {
    parts.push(citation.title + '.');
  }

  // Source (journal/publisher) with volume/issue/pages for journals
  if (citation.source) {
    if (citation.type === 'journal') {
      let journalPart = `*${citation.source}*`;

      // Add volume and issue
      if (citation.volume) {
        if (citation.issue) {
          journalPart += `, *${citation.volume}*(${citation.issue})`;
        } else {
          journalPart += `, *${citation.volume}*`;
        }
      }

      // Add pages
      if (citation.pages) {
        journalPart += `, ${citation.pages}`;
      }

      parts.push(journalPart + '.');
    } else if (citation.type === 'chapter') {
      // Book chapter / conference proceedings format
      // APA 7th: In E. Editor (Ed.), *Book title* (ed., pp. X–Y). Publisher.

      // Extract book title (remove "In " prefix if present)
      let bookTitle = citation.source;
      if (bookTitle.startsWith('In ')) {
        bookTitle = bookTitle.substring(3);
      }

      let chapterPart = 'In ';

      // Add editors if available, or placeholder if missing
      if (citation.editors && citation.editors.length > 0) {
        const editorStrings = citation.editors.map(e => `${e.initials} ${e.lastName}`);
        let editorsStr: string;
        if (editorStrings.length === 1) {
          editorsStr = editorStrings[0];
        } else if (editorStrings.length === 2) {
          editorsStr = editorStrings[0] + ' & ' + editorStrings[1];
        } else {
          const lastEditor = editorStrings[editorStrings.length - 1];
          const restEditors = editorStrings.slice(0, -1);
          editorsStr = restEditors.join(', ') + ', & ' + lastEditor;
        }
        const edLabel = citation.editors.length === 1 ? 'Ed.' : 'Eds.';
        chapterPart += `${editorsStr} (${edLabel}), `;
      } else {
        // Placeholder for missing editor info
        chapterPart += '[Editor, F. M.] (Ed.), ';
      }

      // Add italicized book/proceedings title
      chapterPart += `*${bookTitle}*`;

      // Add edition and pages in parentheses
      if (citation.edition || citation.pages) {
        const parenParts: string[] = [];
        if (citation.edition) {
          parenParts.push(`${toOrdinal(citation.edition)} ed.`);
        }
        if (citation.pages) {
          parenParts.push(`pp. ${citation.pages}`);
        }
        chapterPart += ` (${parenParts.join(', ')})`;
      }

      chapterPart += '.';

      // Add publisher
      if (citation.publisher) {
        chapterPart += ` ${citation.publisher}.`;
      }

      parts.push(chapterPart);
    } else if (citation.type === 'book') {
      parts.push(`*${citation.source}*.`);
    } else {
      parts.push(citation.source);
    }
  }

  // DOI
  if (citation.doi) {
    parts.push(citation.doi);
  } else if (citation.url) {
    parts.push(citation.url);
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Calculate compliance score based on errors and fixes
 */
export function calculateScore(errors: ValidationError[], autoFixes: AutoFix[]): number {
  let score = 100;

  // Deduct points for each error
  for (const error of errors) {
    switch (error.severity) {
      case 'error':
        score -= 15;
        break;
      case 'warning':
        score -= 10;
        break;
      case 'info':
        score -= 5;
        break;
    }
  }

  // Add back half points for auto-fixed items
  for (const fix of autoFixes) {
    const originalError = errors.find(e => e.rule === fix.rule && e.field === fix.field);
    if (originalError) {
      switch (originalError.severity) {
        case 'error':
          score += 7.5;
          break;
        case 'warning':
          score += 5;
          break;
        case 'info':
          score += 2.5;
          break;
      }
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate helpful hints for manual fixes
 */
function getManualFixHint(error: ValidationError): string {
  switch (error.rule) {
    case 'authorFormat':
      if (error.message.includes('missing initials')) {
        return 'Add first and middle initials in format "F. M." after the last name.';
      }
      if (error.message.includes('missing last name')) {
        return 'Provide the author\'s last name.';
      }
      return 'Format author as: LastName, F. M.';

    case 'yearFormat':
      return 'Provide a 4-digit year (YYYY) in parentheses.';

    case 'doiPresence':
      return 'Search for the DOI on CrossRef or the publisher\'s website. If unavailable, this is acceptable.';

    case 'doiFormat':
      return 'DOI should be in format: https://doi.org/10.xxxx/xxxxx';

    case 'titleCase':
      return 'Verify proper nouns are still capitalized correctly in the converted title.';

    case 'volumeFormat':
      return 'Volume should be just the number (e.g., "23" not "Vol. 23").';

    case 'issueFormat':
      return 'Issue should be just the number in parentheses (e.g., "(4)" not "No. 4").';

    case 'pageFormat':
      return 'Use en dash (–) for page ranges and remove "pp." prefix for journal articles.';

    case 'journalNameCase':
      return 'Journal names should use Title Case (e.g., "Journal of Educational Psychology" not "journal of educational psychology").';

    case 'conferenceNameCase':
      return 'Conference/proceedings names are proper nouns and should use Title Case (e.g., "International Conference on Information Systems").';

    case 'chapterEditors':
      return 'Look up the book on the publisher\'s website or Google Books to find the editor(s). Format: In F. M. Editor (Ed.), for one editor, or In F. Editor & G. Editor (Eds.), for multiple.';

    case 'ampersand':
      return 'Use ampersand (&) before the last author in reference lists.';

    case 'typeMismatch':
      return 'CrossRef metadata indicates this citation is a different type than detected. Verify the citation format matches the actual publication type.';

    default:
      return error.message;
  }
}
