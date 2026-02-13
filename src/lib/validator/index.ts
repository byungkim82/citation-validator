import { ParsedCitation, ValidationResult, ValidationError, CrossRefWork } from '../types';
import { parseCitation, parseCitations } from './parser';
import { ALL_RULES } from './rules';
import { applyAutoFixes, calculateScore } from './auto-fix';
import { searchByTitle, titleSimilarity } from '../crossref/client';
import { randomUUID } from 'crypto';

/**
 * Rate limiting helper for CrossRef API calls
 */
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private readonly maxConcurrent = 3;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
    }
  }
}

const rateLimiter = new RateLimiter();

/**
 * Map CrossRef type string to our citation type
 */
function mapCrossRefType(crossRefType: string): ParsedCitation['type'] {
  switch (crossRefType) {
    case 'journal-article': return 'journal';
    case 'book-chapter': return 'chapter';
    case 'proceedings-article': return 'chapter';
    case 'book': return 'book';
    default: return 'unknown';
  }
}

/**
 * Correct citation type and fields based on CrossRef metadata
 */
function correctCitationWithCrossRef(
  citation: ParsedCitation,
  crossRefWork: CrossRefWork
): { corrected: ParsedCitation; typeChanged: boolean } {
  const crossRefType = mapCrossRefType(crossRefWork.type);

  // Add DOI if missing
  const corrected: ParsedCitation = {
    ...citation,
    authors: citation.authors.map(a => ({ ...a })),
  };

  if (!corrected.doi && crossRefWork.doi) {
    corrected.doi = `https://doi.org/${crossRefWork.doi.replace(/^https?:\/\/doi\.org\//, '')}`;
  }

  // Supplement incomplete page info from CrossRef (e.g., "126" → "126-138")
  if (crossRefWork.pages && corrected.pages) {
    const currentPages = corrected.pages.replace(/\s/g, '');
    const crossRefPages = crossRefWork.pages.replace(/\s/g, '');
    // If our pages is just a start page (no range) but CrossRef has the full range
    if (!currentPages.includes('-') && !currentPages.includes('–') && crossRefPages.includes('-')) {
      corrected.pages = crossRefWork.pages;
    }
  } else if (crossRefWork.pages && !corrected.pages) {
    corrected.pages = crossRefWork.pages;
  }

  // No type correction needed if types match or CrossRef type is unknown
  if (crossRefType === citation.type || crossRefType === 'unknown') {
    return { corrected, typeChanged: false };
  }

  // Apply type correction
  corrected.type = crossRefType;

  // Handle journal → chapter correction
  if (citation.type === 'journal' && crossRefType === 'chapter') {
    // Volume was likely misinterpreted as start page number
    if (corrected.volume && corrected.pages) {
      // Combine: volume="267", pages="-282" or pages="282" → pages="267-282"
      const cleanPages = corrected.pages.replace(/^[-–]/, '');
      corrected.pages = `${corrected.volume}-${cleanPages}`;
    } else if (corrected.volume && !corrected.pages) {
      // Volume alone might be a single page reference
      corrected.pages = corrected.volume;
    }
    corrected.volume = undefined;
    corrected.issue = undefined;

    // Add "In " prefix to source if not already present
    if (corrected.source && !corrected.source.startsWith('In ')) {
      corrected.source = `In ${corrected.source}`;
    }

    // Add publisher from CrossRef
    if (crossRefWork.publisher) {
      corrected.publisher = crossRefWork.publisher;
    }

    // Add editors from CrossRef
    if (crossRefWork.editors && crossRefWork.editors.length > 0) {
      corrected.editors = crossRefWork.editors;
    }

    // Add edition from CrossRef (ignore "0" or invalid values)
    if (crossRefWork.edition && parseInt(crossRefWork.edition) > 1) {
      corrected.edition = crossRefWork.edition;
    }
  }

  return { corrected, typeChanged: true };
}

/**
 * Validate a single citation with parallel CrossRef lookup
 */
export async function validateCitation(
  text: string,
  useCrossRef: boolean = true
): Promise<ValidationResult> {
  // Step 1: Parse the citation (synchronous, instant)
  let citation = parseCitation(text);
  let typeChanged = false;
  let originalPages = citation.pages;

  // Step 2: CrossRef lookup in parallel with type correction
  if (useCrossRef && citation.title && citation.authors.length > 0) {
    try {
      const crossRefWork = await rateLimiter.execute(() =>
        searchByTitle(citation.title)
      );

      if (crossRefWork && crossRefWork.doi) {
        // Verify it's the right paper
        const similarity = titleSimilarity(citation.title, crossRefWork.title);

        let authorMatches = true;
        if (citation.authors.length > 0 && crossRefWork.authors.length > 0) {
          const firstAuthorInput = citation.authors[0].lastName.toLowerCase().trim();
          const firstAuthorCrossRef = crossRefWork.authors[0].lastName.toLowerCase().trim();
          authorMatches = firstAuthorInput.includes(firstAuthorCrossRef) ||
                         firstAuthorCrossRef.includes(firstAuthorInput);
        }

        if (similarity >= 0.5 && authorMatches) {
          const result = correctCitationWithCrossRef(citation, crossRefWork);
          citation = result.corrected;
          typeChanged = result.typeChanged;
        }
      }
    } catch (error) {
      console.warn('CrossRef lookup failed:', error);
    }
  }

  // Step 3: Run validation rules (with corrected type if applicable)
  const errors: ValidationError[] = [];
  for (const rule of ALL_RULES) {
    const ruleErrors = rule(citation);
    errors.push(...ruleErrors);
  }

  // Add type mismatch info if CrossRef indicated different type
  if (typeChanged) {
    errors.push({
      rule: 'typeMismatch',
      field: 'type',
      message: `CrossRef indicates this is a ${citation.type === 'chapter' ? 'book chapter/proceedings' : citation.type}, not a journal article. Citation format has been corrected.`,
      severity: 'info',
      original: 'journal',
      autoFixable: false,
    });
  }

  // Step 4: Apply auto-fixes
  const { fixedCitation, autoFixes, manualFixes } = applyAutoFixes(citation, errors);

  // Add CrossRef page completion to auto-fixes report
  if (originalPages !== citation.pages && citation.pages) {
    autoFixes.push({
      rule: 'pageCompletion',
      field: 'pages',
      original: originalPages || '(missing)',
      fixed: citation.pages,
      description: `Page range completed via CrossRef: ${originalPages || '(missing)'} → ${citation.pages}`,
    });
  }

  // Step 5: Calculate score
  const score = calculateScore(errors, autoFixes);

  return {
    id: randomUUID(),
    citation,
    errors,
    autoFixes,
    manualFixes,
    fixedCitation,
    score,
  };
}

/**
 * Validate multiple citations with parallel CrossRef lookups
 */
export async function validateCitations(
  text: string,
  useCrossRef: boolean = true
): Promise<ValidationResult[]> {
  const citations = parseCitations(text);

  if (!useCrossRef) {
    return Promise.all(citations.map(c => validateCitation(c.raw, false)));
  }

  // Process with rate limiting
  const results: ValidationResult[] = [];

  for (const citation of citations) {
    const result = await validateCitation(citation.raw, true);
    results.push(result);

    // Small delay between requests to be polite to CrossRef API
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return results;
}

/**
 * Validate a citation synchronously without CrossRef lookup
 * Useful for quick local-only validation
 */
export function validateCitationWithoutCrossRef(text: string): ValidationResult {
  const citation = parseCitation(text);

  const errors: ValidationError[] = [];
  for (const rule of ALL_RULES) {
    const ruleErrors = rule(citation);
    errors.push(...ruleErrors);
  }

  const { fixedCitation, autoFixes, manualFixes } = applyAutoFixes(citation, errors);
  const score = calculateScore(errors, autoFixes);

  return {
    id: randomUUID(),
    citation,
    errors,
    autoFixes,
    manualFixes,
    fixedCitation,
    score,
  };
}

// Re-export types for convenience
export type { ParsedCitation, ValidationResult, ValidationError } from '../types';
export { parseCitation, parseCitations } from './parser';
export { ALL_RULES } from './rules';
export { applyAutoFixes, calculateScore } from './auto-fix';
export { searchByTitle, lookupByDOI } from '../crossref/client';
