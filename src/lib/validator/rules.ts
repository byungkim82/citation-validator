import { Author, ParsedCitation, ValidationError } from '../types';

/**
 * Helper: Convert title to sentence case
 * Capitalizes first word and words after colons/periods
 */
export function toSentenceCase(title: string): string {
  // Split by colon or period to handle subtitles
  const parts = title.split(/([:.]\s)/);

  return parts.map((part, index) => {
    if (part.match(/^[:.]\s$/)) {
      return part; // Keep delimiter as-is
    }

    const words = part.split(/\s+/);
    return words.map((word, wordIndex) => {
      // Capitalize first word of each part (first word of title or first word after delimiter)
      if (wordIndex === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      // Keep acronyms (2-5 uppercase letters)
      if (word.match(/^[A-Z]{2,5}$/)) {
        return word;
      }
      // ALL other words: lowercase
      return word.toLowerCase();
    }).join(' ');
  }).join('');
}

/**
 * Helper: Detect if title likely uses Title Case
 * Returns true if 3+ words start with uppercase
 */
export function isLikelyTitleCase(title: string): boolean {
  const words = title.split(/\s+/).filter(w => w.length > 3); // Ignore short words like "a", "the"
  const capitalizedWords = words.filter(w => /^[A-Z]/.test(w));
  return capitalizedWords.length >= 3 && capitalizedWords.length >= words.length * 0.6;
}

/**
 * Rule: Check author format follows "Surname, F. M." pattern
 * Skips initials check for group/organizational authors
 */
export function checkAuthorFormat(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  citation.authors.forEach((author, index) => {
    // Group authors only need a name, no initials
    if (author.isGroupAuthor) {
      if (!author.lastName || author.lastName.trim() === '') {
        errors.push({
          rule: 'authorFormat',
          field: 'authors',
          message: `Author ${index + 1} missing organization name`,
          severity: 'error',
          original: JSON.stringify(author),
          autoFixable: false,
        });
      }
      return;
    }

    // Check if initials have proper spacing and periods
    const initialsPattern = /^([A-Z]\.\s)*[A-Z]\.$/;

    if (!author.initials) {
      errors.push({
        rule: 'authorFormat',
        field: 'authors',
        message: `Author ${index + 1} (${author.lastName}) missing initials`,
        severity: 'error',
        original: author.lastName,
        autoFixable: false,
      });
    } else if (!initialsPattern.test(author.initials)) {
      const suggested = author.initials
        .replace(/\./g, '. ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(i => i.endsWith('.') ? i : i + '.')
        .join(' ');

      errors.push({
        rule: 'authorFormat',
        field: 'authors',
        message: `Author ${index + 1} initials should be formatted as "F. M." (with spaces and periods)`,
        severity: 'error',
        original: author.initials,
        suggested,
        autoFixable: true,
      });
    }

    if (!author.lastName || author.lastName.trim() === '') {
      errors.push({
        rule: 'authorFormat',
        field: 'authors',
        message: `Author ${index + 1} missing last name`,
        severity: 'error',
        original: JSON.stringify(author),
        autoFixable: false,
      });
    }
  });

  return errors;
}

/**
 * Rule: Check year format is (YYYY), (n.d.), (in press), or (YYYYa).
 */
export function checkYearFormat(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];
  // Accept: 4-digit year, "n.d.", "in press"
  const validPattern = /^\d{4}$|^n\.d\.$|^in press$/;

  if (!citation.year) {
    errors.push({
      rule: 'yearFormat',
      field: 'year',
      message: 'Year is missing',
      severity: 'error',
      original: '',
      autoFixable: false,
    });
  } else if (!validPattern.test(citation.year)) {
    const yearMatch = citation.year.match(/\d{4}/);
    const suggested = yearMatch ? yearMatch[0] : '';

    errors.push({
      rule: 'yearFormat',
      field: 'year',
      message: 'Year should be 4-digit format (YYYY), "n.d.", or "in press"',
      severity: 'error',
      original: citation.year,
      suggested,
      autoFixable: !!suggested,
    });
  }

  return errors;
}

/**
 * Rule: Check title uses sentence case (not Title Case)
 */
export function checkTitleCase(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!citation.title) {
    errors.push({
      rule: 'titleCase',
      field: 'title',
      message: 'Title is missing',
      severity: 'error',
      original: '',
      autoFixable: false,
    });
    return errors;
  }

  if (isLikelyTitleCase(citation.title)) {
    const suggested = toSentenceCase(citation.title);
    errors.push({
      rule: 'titleCase',
      field: 'title',
      message: 'Title should use sentence case (only first word and proper nouns capitalized)',
      severity: 'warning',
      original: citation.title,
      suggested,
      autoFixable: true,
    });
  }

  return errors;
}

/**
 * Rule: Check if DOI is present
 */
export function checkDOIPresence(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type === 'journal' && !citation.doi) {
    errors.push({
      rule: 'doiPresence',
      field: 'doi',
      message: 'DOI should be included when available for journal articles',
      severity: 'warning',
      original: '',
      autoFixable: false,
    });
  }

  return errors;
}

/**
 * Rule: Check DOI format is https://doi.org/...
 */
export function checkDOIFormat(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!citation.doi) {
    return errors;
  }

  const doi = citation.doi.trim();

  // Check for trailing period
  if (doi.endsWith('.')) {
    errors.push({
      rule: 'doiFormat',
      field: 'doi',
      message: 'DOI should not end with a period',
      severity: 'error',
      original: doi,
      suggested: doi.slice(0, -1),
      autoFixable: true,
    });
  }

  // Check for old format (doi:10.xxx)
  if (doi.startsWith('doi:')) {
    const doiNumber = doi.replace(/^doi:\s*/, '');
    errors.push({
      rule: 'doiFormat',
      field: 'doi',
      message: 'DOI should use format https://doi.org/...',
      severity: 'error',
      original: doi,
      suggested: `https://doi.org/${doiNumber}`,
      autoFixable: true,
    });
  } else if (!doi.startsWith('https://doi.org/')) {
    // Check if it's just the DOI number
    if (doi.match(/^10\.\d+\//)) {
      errors.push({
        rule: 'doiFormat',
        field: 'doi',
        message: 'DOI should include full URL https://doi.org/...',
        severity: 'error',
        original: doi,
        suggested: `https://doi.org/${doi}`,
        autoFixable: true,
      });
    } else {
      errors.push({
        rule: 'doiFormat',
        field: 'doi',
        message: 'DOI should start with https://doi.org/',
        severity: 'error',
        original: doi,
        autoFixable: false,
      });
    }
  }

  return errors;
}

/**
 * Rule: Check Volume(Issue) format
 */
export function checkVolumeIssueFormat(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.volume) {
    // Check for "Vol." prefix
    if (citation.volume.toLowerCase().includes('vol')) {
      const suggested = citation.volume.replace(/vol\.?\s*/i, '');
      errors.push({
        rule: 'volumeFormat',
        field: 'volume',
        message: 'Volume should not include "Vol." prefix',
        severity: 'error',
        original: citation.volume,
        suggested,
        autoFixable: true,
      });
    }

    // Check if volume is numeric
    const cleanVolume = citation.volume.replace(/vol\.?\s*/i, '');
    if (!/^\d+$/.test(cleanVolume)) {
      errors.push({
        rule: 'volumeFormat',
        field: 'volume',
        message: 'Volume should be a number',
        severity: 'warning',
        original: citation.volume,
        autoFixable: false,
      });
    }
  }

  if (citation.issue) {
    // Check for "No." prefix
    if (citation.issue.toLowerCase().includes('no')) {
      const suggested = citation.issue.replace(/no\.?\s*/i, '');
      errors.push({
        rule: 'issueFormat',
        field: 'issue',
        message: 'Issue should not include "No." prefix',
        severity: 'error',
        original: citation.issue,
        suggested,
        autoFixable: true,
      });
    }
  }

  return errors;
}

/**
 * Rule: Check page range format
 */
export function checkPageFormat(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!citation.pages) {
    return errors;
  }

  const pages = citation.pages.trim();

  // Check for "pp." prefix (not allowed for journal articles)
  if (citation.type === 'journal' && pages.toLowerCase().startsWith('pp')) {
    const suggested = pages.replace(/pp\.?\s*/i, '');
    errors.push({
      rule: 'pageFormat',
      field: 'pages',
      message: 'Page numbers should not include "pp." prefix for journal articles',
      severity: 'error',
      original: pages,
      suggested,
      autoFixable: true,
    });
  }

  // Check for hyphen instead of en dash
  const cleanPages = pages.replace(/pp\.?\s*/i, '');
  if (cleanPages.includes('-') && !cleanPages.includes('–')) {
    const suggested = cleanPages.replace(/-/g, '–');
    errors.push({
      rule: 'pageFormat',
      field: 'pages',
      message: 'Page range should use en dash (–) not hyphen (-)',
      severity: 'warning',
      original: pages,
      suggested,
      autoFixable: true,
    });
  }

  return errors;
}

/**
 * Rule: Check & usage before last author
 */
export function checkAmpersand(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.authors.length < 2) {
    return errors;
  }

  // Extract only the author block (text before the year) to check for "and" vs "&"
  // This avoids false positives from "and" appearing in the title
  if (citation.authors.length >= 2 && citation.authors.length <= 20) {
    const yearMatch = citation.raw.match(/\(\d{4}/);
    const authorBlock = yearMatch
      ? citation.raw.substring(0, citation.raw.indexOf(yearMatch[0]))
      : '';

    if (authorBlock && authorBlock.includes(' and ')) {
      errors.push({
        rule: 'ampersand',
        field: 'authors',
        message: 'Use ampersand (&) not "and" before last author in reference list',
        severity: 'error',
        original: authorBlock.trim(),
        autoFixable: true,
      });
    }
  }

  if (citation.authors.length > 20) {
    // Should use ellipsis format: First 19 authors ... Last author
    errors.push({
      rule: 'ampersand',
      field: 'authors',
      message: 'For 21+ authors, use first 19 authors, ellipsis (...), then last author',
      severity: 'info',
      original: `${citation.authors.length} authors listed`,
      autoFixable: true,
    });
  }

  return errors;
}

/**
 * Minor words that should NOT be capitalized in Title Case
 * (unless they are the first or last word)
 */
const MINOR_WORDS = new Set([
  'a', 'an', 'the',
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'of', 'in', 'on', 'at', 'to', 'by', 'up', 'as', 'if', 'is',
  'it', 'its', 'vs', 'via', 'per', 'with', 'from',
]);

/**
 * Helper: Convert text to Title Case (for journal names)
 * Capitalizes all words except minor words (unless first/last)
 */
export function toTitleCase(text: string): string {
  const words = text.split(/\s+/);
  return words.map((word, index) => {
    // Always capitalize first and last word
    if (index === 0 || index === words.length - 1) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    // Keep acronyms
    if (word.match(/^[A-Z]{2,5}$/)) {
      return word;
    }
    // Don't capitalize minor words
    if (MINOR_WORDS.has(word.toLowerCase())) {
      return word.toLowerCase();
    }
    // Capitalize major words
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Helper: Detect if journal name is likely in sentence case (incorrect for APA)
 * Returns true if major words are lowercase when they shouldn't be
 */
function isJournalNameNotTitleCase(source: string): boolean {
  const words = source.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) return false;

  let majorWordsLowercase = 0;
  let totalMajorWords = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Skip minor words (except first/last)
    if (i > 0 && i < words.length - 1 && MINOR_WORDS.has(word.toLowerCase())) {
      continue;
    }
    totalMajorWords++;
    // Check if a major word starts with lowercase
    if (/^[a-z]/.test(word)) {
      majorWordsLowercase++;
    }
  }

  // If 2+ major words are lowercase, journal name is likely not in Title Case
  return majorWordsLowercase >= 2;
}

/**
 * Rule: Check journal name uses Title Case
 */
export function checkJournalNameCase(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type !== 'journal' || !citation.source) {
    return errors;
  }

  if (isJournalNameNotTitleCase(citation.source)) {
    const suggested = toTitleCase(citation.source);
    errors.push({
      rule: 'journalNameCase',
      field: 'source',
      message: 'Journal name should use Title Case (capitalize major words)',
      severity: 'warning',
      original: citation.source,
      suggested,
      autoFixable: true,
    });
  }

  return errors;
}

/**
 * Rule: Check conference/proceedings name uses Title Case (proper noun)
 */
export function checkConferenceNameCase(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type !== 'chapter' || !citation.source) {
    return errors;
  }

  // Extract the conference/proceedings name (remove "In " prefix)
  let conferenceName = citation.source;
  if (conferenceName.startsWith('In ')) {
    conferenceName = conferenceName.substring(3);
  }

  if (isJournalNameNotTitleCase(conferenceName)) {
    const suggested = 'In ' + toTitleCase(conferenceName);
    errors.push({
      rule: 'conferenceNameCase',
      field: 'source',
      message: 'Conference/proceedings name should use Title Case (proper noun)',
      severity: 'warning',
      original: citation.source,
      suggested,
      autoFixable: true,
    });
  }

  return errors;
}

/**
 * Rule: Check if book chapter has editor information
 */
export function checkChapterEditors(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type !== 'chapter') {
    return errors;
  }

  if (!citation.editors || citation.editors.length === 0) {
    errors.push({
      rule: 'chapterEditors',
      field: 'editors',
      message: 'Book chapter should include editor(s): In F. M. Editor (Ed.), Book title',
      severity: 'warning',
      original: '',
      autoFixable: false,
    });
  }

  return errors;
}

// ── NEW RULES (10.1-10.6 extension) ──────────────────────────────────

/**
 * Rule: Check citation ends with a period (DOI/URL endings exempt)
 */
export function checkTerminalPeriod(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];
  const raw = citation.raw.trim();
  if (!raw) return errors;

  // DOI or URL at end is acceptable without trailing period
  if (/https?:\/\/[^\s]+$/.test(raw) || /doi\.org\/[^\s]+$/.test(raw)) {
    return errors;
  }

  if (!raw.endsWith('.')) {
    errors.push({
      rule: 'terminalPeriod',
      field: 'raw',
      message: 'Citation should end with a period',
      severity: 'warning',
      original: raw.slice(-20),
      suggested: raw + '.',
      autoFixable: true,
    });
  }

  return errors;
}

/**
 * Rule: Conference citations should include full date (month/day)
 */
export function checkFullDateRequired(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type !== 'conference') return errors;

  if (!citation.fullDate) {
    errors.push({
      rule: 'fullDateRequired',
      field: 'year',
      message: 'Conference presentations should include the full date (year, month day–day)',
      severity: 'warning',
      original: citation.year || '',
      autoFixable: false,
    });
  }

  return errors;
}

/**
 * Rule: Books, chapters, and reports should have a publisher
 */
export function checkPublisherRequired(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!['book', 'chapter', 'report'].includes(citation.type)) return errors;

  if (!citation.publisher && !citation.source) {
    errors.push({
      rule: 'publisherRequired',
      field: 'publisher',
      message: `${citation.type === 'chapter' ? 'Book chapter' : citation.type === 'report' ? 'Report' : 'Book'} should include a publisher`,
      severity: 'error',
      original: '',
      autoFixable: false,
    });
  }

  return errors;
}

/**
 * Rule: Edition should be a number if present
 */
export function checkEditionFormat(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!citation.edition) return errors;

  if (!/^\d+$/.test(citation.edition)) {
    errors.push({
      rule: 'editionFormat',
      field: 'edition',
      message: 'Edition should be a number (e.g., "2" for 2nd edition)',
      severity: 'error',
      original: citation.edition,
      autoFixable: false,
    });
  }

  return errors;
}

/**
 * Rule: APA 7th removed location from publisher — warn if "City, ST:" pattern found
 */
export function checkPublisherLocation(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  const pub = citation.publisher || citation.source || '';
  // Match "City, ST:" or "City, State:" pattern
  const locationMatch = pub.match(/^([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}:\s*)/);
  if (locationMatch) {
    const suggested = pub.replace(locationMatch[1], '').trim();
    errors.push({
      rule: 'publisherLocation',
      field: 'publisher',
      message: 'APA 7th edition no longer includes publisher location. Remove "City, ST:" prefix.',
      severity: 'warning',
      original: pub,
      suggested,
      autoFixable: true,
    });
  }

  return errors;
}

/**
 * Rule: Book chapter source should start with "In "
 */
export function checkInPrefix(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type !== 'chapter' || !citation.source) return errors;

  if (!citation.source.startsWith('In ')) {
    const suggested = `In ${citation.source}`;
    errors.push({
      rule: 'inPrefix',
      field: 'source',
      message: 'Book chapter source should begin with "In " (e.g., In F. Editor (Ed.), Book title)',
      severity: 'error',
      original: citation.source,
      suggested,
      autoFixable: true,
    });
  }

  return errors;
}

/**
 * Rule: Conference/dissertation should have bracket type descriptor
 */
export function checkBracketType(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!['conference', 'dissertation'].includes(citation.type)) return errors;

  if (!citation.bracketType) {
    const expected = citation.type === 'conference'
      ? '[Paper presentation]'
      : '[Doctoral dissertation, Institution Name]';
    errors.push({
      rule: 'bracketType',
      field: 'bracketType',
      message: `${citation.type === 'conference' ? 'Conference presentation' : 'Dissertation'} should include type descriptor in brackets (e.g., ${expected})`,
      severity: 'error',
      original: '',
      autoFixable: false,
    });
  }

  return errors;
}

/**
 * Rule: Conference citation should include conference name
 */
export function checkConferenceInfo(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type !== 'conference') return errors;

  if (!citation.conferenceName) {
    errors.push({
      rule: 'conferenceInfo',
      field: 'conferenceName',
      message: 'Conference presentation should include conference name and location',
      severity: 'error',
      original: '',
      autoFixable: false,
    });
  }

  return errors;
}

/**
 * Rule: Dissertation should include institution name
 */
export function checkDissertationInfo(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type !== 'dissertation') return errors;

  if (!citation.institution) {
    errors.push({
      rule: 'dissertationInfo',
      field: 'institution',
      message: 'Dissertation should include institution name in brackets (e.g., [Doctoral dissertation, University Name])',
      severity: 'error',
      original: '',
      autoFixable: false,
    });
  }

  return errors;
}

/**
 * Rule: Report should ideally include a report number
 */
export function checkReportNumber(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  if (citation.type !== 'report') return errors;

  if (!citation.reportNumber) {
    errors.push({
      rule: 'reportNumber',
      field: 'reportNumber',
      message: 'Report should include a report number if available (e.g., Report No. 2024-01)',
      severity: 'info',
      original: '',
      autoFixable: false,
    });
  }

  return errors;
}

// ── ROUTING SYSTEM ───────────────────────────────────────────────────

/**
 * Type definition for validation rules
 */
export type ValidationRule = (citation: ParsedCitation) => ValidationError[];

/**
 * A rule with type routing information
 */
export interface RoutedRule {
  rule: ValidationRule;
  appliesTo: ParsedCitation['type'][] | 'all';
}

/**
 * All validation rules with type routing
 */
export const ROUTED_RULES: RoutedRule[] = [
  // Universal rules
  { rule: checkAuthorFormat, appliesTo: 'all' },
  { rule: checkYearFormat, appliesTo: 'all' },
  { rule: checkTitleCase, appliesTo: 'all' },
  { rule: checkDOIFormat, appliesTo: 'all' },
  { rule: checkAmpersand, appliesTo: 'all' },
  { rule: checkTerminalPeriod, appliesTo: 'all' },

  // Journal-specific
  { rule: checkDOIPresence, appliesTo: ['journal'] },
  { rule: checkVolumeIssueFormat, appliesTo: ['journal'] },
  { rule: checkJournalNameCase, appliesTo: ['journal'] },

  // Journal + Chapter
  { rule: checkPageFormat, appliesTo: ['journal', 'chapter'] },

  // Chapter-specific
  { rule: checkConferenceNameCase, appliesTo: ['chapter'] },
  { rule: checkChapterEditors, appliesTo: ['chapter'] },
  { rule: checkInPrefix, appliesTo: ['chapter'] },

  // Book/Chapter/Report
  { rule: checkPublisherRequired, appliesTo: ['book', 'chapter', 'report'] },
  { rule: checkEditionFormat, appliesTo: ['book', 'chapter'] },
  { rule: checkPublisherLocation, appliesTo: ['book', 'chapter'] },

  // Conference-specific
  { rule: checkFullDateRequired, appliesTo: ['conference'] },
  { rule: checkConferenceInfo, appliesTo: ['conference'] },

  // Conference + Dissertation
  { rule: checkBracketType, appliesTo: ['conference', 'dissertation'] },

  // Dissertation-specific
  { rule: checkDissertationInfo, appliesTo: ['dissertation'] },

  // Report-specific
  { rule: checkReportNumber, appliesTo: ['report'] },
];

/**
 * Get rules applicable to a citation's type
 */
export function getRulesForType(type: ParsedCitation['type']): ValidationRule[] {
  return ROUTED_RULES
    .filter(r => r.appliesTo === 'all' || r.appliesTo.includes(type))
    .map(r => r.rule);
}

/**
 * All validation rules (flat list, backwards-compatible)
 */
export const ALL_RULES: ValidationRule[] = ROUTED_RULES.map(r => r.rule);
