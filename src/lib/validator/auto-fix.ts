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

/** Rule → citation field mapping for data-driven auto-fixes */
const FIELD_MAP: Record<string, keyof ParsedCitation> = {
  yearFormat: 'year',
  titleCase: 'title',
  doiFormat: 'doi',
  volumeFormat: 'volume',
  issueFormat: 'issue',
  pageFormat: 'pages',
  journalNameCase: 'source',
  conferenceNameCase: 'source',
  publisherLocation: 'publisher',
  inPrefix: 'source',
  terminalPeriod: 'raw',
};

/** Auto-fix description generators per rule */
const FIX_DESCRIPTIONS: Record<string, (error: ValidationError) => string> = {
  yearFormat: (e) => `Corrected year format to "${e.suggested}"`,
  titleCase: () => 'Converted title to sentence case (verify proper nouns)',
  doiFormat: (e) => `Corrected DOI format to "${e.suggested}"`,
  volumeFormat: () => 'Removed "Vol." prefix from volume',
  issueFormat: () => 'Removed "No." prefix from issue',
  pageFormat: (e) => e.message.includes('pp.') ? 'Removed "pp." prefix' : 'Changed hyphen to en dash',
  journalNameCase: () => 'Converted journal name to Title Case',
  conferenceNameCase: () => 'Converted conference/proceedings name to Title Case',
  publisherLocation: () => 'Removed publisher location (APA 7th change)',
  inPrefix: () => 'Added "In " prefix to chapter source',
  terminalPeriod: () => 'Added terminal period',
};

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

    // Special case: authorFormat (needs index parsing)
    if (error.rule === 'authorFormat') {
      if (error.suggested && error.field === 'authors') {
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
      continue;
    }

    // Special case: ampersand (handled during reconstruction)
    if (error.rule === 'ampersand') {
      autoFixes.push({
        rule: 'ampersand',
        field: 'authors',
        original: 'and',
        fixed: '&',
        description: 'Changed "and" to "&" before last author',
      });
      continue;
    }

    // Data-driven field fixes
    const field = FIELD_MAP[error.rule];
    if (field && error.suggested) {
      const original = (fixedCitation[field] as string) || '';
      (fixedCitation as unknown as Record<string, unknown>)[field] = error.suggested;
      autoFixes.push({
        rule: error.rule,
        field,
        original,
        fixed: error.suggested,
        description: FIX_DESCRIPTIONS[error.rule]?.(error) ?? error.message,
      });
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
        return '...';
      }
      if (citation.authors.length > 20 && index > 19 && index < citation.authors.length - 1) {
        return null;
      }
      // Group authors: just the name, no initials
      if (author.isGroupAuthor) {
        return author.lastName;
      }
      return `${author.lastName}, ${author.initials}`;
    }).filter(Boolean);

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

  // Year (with fullDate and yearSuffix support)
  if (citation.year) {
    if (citation.fullDate) {
      parts.push(`(${citation.fullDate}).`);
    } else if (citation.yearSuffix) {
      parts.push(`(${citation.year}${citation.yearSuffix}).`);
    } else {
      parts.push(`(${citation.year}).`);
    }
  }

  // Title
  if (citation.title) {
    parts.push(citation.title + '.');
  }

  // For report/conference/dissertation, handle reconstruction even without source
  if (!citation.source && ['report', 'conference', 'dissertation'].includes(citation.type)) {
    if (citation.type === 'report') {
      let reportPart = `*${citation.title}*`;
      if (citation.reportNumber) {
        reportPart = `*${citation.title}* (Report No. ${citation.reportNumber})`;
      }
      reportPart += '.';
      if (citation.publisher) {
        reportPart += ` ${citation.publisher}.`;
      }
      const titleIdx = parts.findIndex(p => p === citation.title + '.');
      if (titleIdx >= 0) parts.splice(titleIdx, 1);
      parts.push(reportPart);
    } else if (citation.type === 'conference') {
      let confPart = citation.title;
      if (citation.bracketType) {
        confPart += ` [${citation.bracketType}]`;
      }
      confPart += '.';
      if (citation.conferenceName) {
        confPart += ` ${citation.conferenceName}.`;
      }
      const titleIdx = parts.findIndex(p => p === citation.title + '.');
      if (titleIdx >= 0) parts.splice(titleIdx, 1);
      parts.push(confPart);
    } else if (citation.type === 'dissertation') {
      let dissPart = `*${citation.title}*`;
      if (citation.bracketType) {
        dissPart += ` [${citation.bracketType}]`;
      }
      dissPart += '.';
      if (citation.databaseName) {
        dissPart += ` ${citation.databaseName}.`;
      }
      const titleIdx = parts.findIndex(p => p === citation.title + '.');
      if (titleIdx >= 0) parts.splice(titleIdx, 1);
      parts.push(dissPart);
    }
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
      // Book: *Title* (Nth ed.). Publisher.
      let bookPart = `*${citation.source}*`;
      if (citation.edition) {
        bookPart += ` (${toOrdinal(citation.edition)} ed.)`;
      }
      bookPart += '.';
      if (citation.publisher) {
        bookPart += ` ${citation.publisher}.`;
      }
      parts.push(bookPart);
    } else if (citation.type === 'report') {
      // Report: *Title* (Report No. xxx). Publisher.
      let reportPart = `*${citation.title}*`;
      if (citation.reportNumber) {
        reportPart = `*${citation.title}* (Report No. ${citation.reportNumber})`;
      }
      reportPart += '.';
      if (citation.publisher || citation.source) {
        reportPart += ` ${citation.publisher || citation.source}.`;
      }
      // Remove the title from earlier since we included it here
      const titleIdx = parts.findIndex(p => p === citation.title + '.');
      if (titleIdx >= 0) parts.splice(titleIdx, 1);
      parts.push(reportPart);
    } else if (citation.type === 'conference') {
      // Conference: Title [Paper presentation]. Conference Name, City, Country.
      let confPart = citation.title;
      if (citation.bracketType) {
        confPart += ` [${citation.bracketType}]`;
      }
      confPart += '.';
      if (citation.conferenceName) {
        confPart += ` ${citation.conferenceName}.`;
      }
      // Remove the title from earlier since we included it here
      const titleIdx = parts.findIndex(p => p === citation.title + '.');
      if (titleIdx >= 0) parts.splice(titleIdx, 1);
      parts.push(confPart);
    } else if (citation.type === 'dissertation') {
      // Dissertation: *Title* [Doctoral dissertation, Institution]. Database.
      let dissPart = `*${citation.title}*`;
      if (citation.bracketType) {
        dissPart += ` [${citation.bracketType}]`;
      }
      dissPart += '.';
      if (citation.databaseName) {
        dissPart += ` ${citation.databaseName}.`;
      }
      // Remove the title from earlier since we included it here
      const titleIdx = parts.findIndex(p => p === citation.title + '.');
      if (titleIdx >= 0) parts.splice(titleIdx, 1);
      parts.push(dissPart);
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

/** Manual fix hints per rule */
const MANUAL_FIX_HINTS: Record<string, string | ((error: ValidationError) => string)> = {
  authorFormat: (error) => {
    if (error.message.includes('missing initials') || error.message.includes('organization name')) {
      return 'Add first and middle initials in format "F. M." after the last name, or provide the full organization name for group authors.';
    }
    if (error.message.includes('missing last name')) {
      return "Provide the author's last name.";
    }
    return 'Format author as: LastName, F. M.';
  },
  yearFormat: 'Provide a 4-digit year (YYYY), "n.d." for no date, or "in press" in parentheses.',
  doiPresence: "Search for the DOI on CrossRef or the publisher's website. If unavailable, this is acceptable.",
  doiFormat: 'DOI should be in format: https://doi.org/10.xxxx/xxxxx',
  titleCase: 'Verify proper nouns are still capitalized correctly in the converted title.',
  volumeFormat: 'Volume should be just the number (e.g., "23" not "Vol. 23").',
  issueFormat: 'Issue should be just the number in parentheses (e.g., "(4)" not "No. 4").',
  pageFormat: 'Use en dash (–) for page ranges and remove "pp." prefix for journal articles.',
  journalNameCase: 'Journal names should use Title Case (e.g., "Journal of Educational Psychology" not "journal of educational psychology").',
  conferenceNameCase: 'Conference/proceedings names are proper nouns and should use Title Case (e.g., "International Conference on Information Systems").',
  chapterEditors: "Look up the book on the publisher's website or Google Books to find the editor(s). Format: In F. M. Editor (Ed.), for one editor, or In F. Editor & G. Editor (Eds.), for multiple.",
  ampersand: 'Use ampersand (&) before the last author in reference lists.',
  typeMismatch: 'CrossRef metadata indicates this citation is a different type than detected. Verify the citation format matches the actual publication type.',
  publisherRequired: 'Add the publisher name after the title/edition.',
  fullDateRequired: 'Conference presentations require the full date including month and day(s) (e.g., 2024, March 15).',
  editionFormat: 'Edition should be a number formatted as ordinal (e.g., 2nd ed.).',
  bracketType: 'Add a type descriptor in brackets after the title (e.g., [Paper presentation], [Doctoral dissertation, University Name]).',
  conferenceInfo: 'Add the conference name and location after the bracket descriptor (e.g., Annual Meeting of APA, Washington, DC, United States).',
  dissertationInfo: 'Include the institution name in brackets (e.g., [Doctoral dissertation, Massachusetts Institute of Technology]).',
  reportNumber: 'Include the report number if available (e.g., Report No. 2024-01) in parentheses after the title.',
  inPrefix: 'Chapter source should start with "In " followed by editors and book title.',
};

function getManualFixHint(error: ValidationError): string {
  const hint = MANUAL_FIX_HINTS[error.rule];
  if (!hint) return error.message;
  return typeof hint === 'function' ? hint(error) : hint;
}
