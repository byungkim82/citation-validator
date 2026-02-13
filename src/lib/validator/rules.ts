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
 */
export function checkAuthorFormat(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];

  citation.authors.forEach((author, index) => {
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
 * Rule: Check year format is (YYYY).
 */
export function checkYearFormat(citation: ParsedCitation): ValidationError[] {
  const errors: ValidationError[] = [];
  const yearPattern = /^\d{4}$/;

  if (!citation.year) {
    errors.push({
      rule: 'yearFormat',
      field: 'year',
      message: 'Year is missing',
      severity: 'error',
      original: '',
      autoFixable: false,
    });
  } else if (!yearPattern.test(citation.year)) {
    const yearMatch = citation.year.match(/\d{4}/);
    const suggested = yearMatch ? yearMatch[0] : '';

    errors.push({
      rule: 'yearFormat',
      field: 'year',
      message: 'Year should be 4-digit format (YYYY)',
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
 * Rule: Check for unwanted "Vol." prefix
 */
export function checkVolPrefix(citation: ParsedCitation): ValidationError[] {
  // This is covered by checkVolumeIssueFormat
  return checkVolumeIssueFormat(citation).filter(e => e.field === 'volume');
}

/**
 * Rule: Check for unwanted "pp." prefix in journal articles
 */
export function checkPpPrefix(citation: ParsedCitation): ValidationError[] {
  // This is covered by checkPageFormat
  return checkPageFormat(citation).filter(e => e.message.includes('pp.'));
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

/**
 * Type definition for validation rules
 */
export type ValidationRule = (citation: ParsedCitation) => ValidationError[];

/**
 * All validation rules in order
 */
export const ALL_RULES: ValidationRule[] = [
  checkAuthorFormat,
  checkYearFormat,
  checkTitleCase,
  checkJournalNameCase,
  checkConferenceNameCase,
  checkChapterEditors,
  checkDOIPresence,
  checkDOIFormat,
  checkVolumeIssueFormat,
  checkPageFormat,
  checkAmpersand,
];
