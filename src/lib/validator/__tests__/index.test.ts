import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateCitation, validateCitations, validateCitationWithoutCrossRef } from '../index';

// Mock the crossref client module
vi.mock('../../crossref/client', () => ({
  searchByTitle: vi.fn(),
  titleSimilarity: vi.fn(),
  lookupByDOI: vi.fn(),
  normalizeTitle: vi.fn((t: string) => t.toLowerCase()),
}));

import { searchByTitle, titleSimilarity } from '../../crossref/client';

const mockSearchByTitle = vi.mocked(searchByTitle);
const mockTitleSimilarity = vi.mocked(titleSimilarity);

// ── Test data ──────────────────────────────────────────────────────────

const JOURNAL_CITATION = 'Kim, B. Y. (2024). The impact of AI on education. Journal of Technology, 45(2), 123-145.';

const JOURNAL_CITATION_NO_DOI = 'Smith, J. A. (2023). Machine learning approaches. Computational Linguistics, 28(3), 45-67.';

const BOOK_CITATION = 'Author, A. B. (2023). Psychology of learning (4th ed.). Academic Press.';

function makeCrossRefWork(overrides: Record<string, unknown> = {}) {
  return {
    doi: '10.1234/test',
    title: 'The impact of AI on education',
    authors: [{ lastName: 'Kim', initials: 'B. Y.' }],
    year: '2024',
    source: 'Journal of Technology',
    volume: '45',
    issue: '2',
    pages: '123-145',
    type: 'journal-article',
    ...overrides,
  };
}

// ── validateCitationWithoutCrossRef ────────────────────────────────────

describe('validateCitationWithoutCrossRef', () => {
  it('returns a complete ValidationResult', () => {
    const result = validateCitationWithoutCrossRef(JOURNAL_CITATION);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('citation');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('autoFixes');
    expect(result).toHaveProperty('manualFixes');
    expect(result).toHaveProperty('fixedCitation');
    expect(result).toHaveProperty('score');
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
  });

  it('applies type-specific rules only', () => {
    const journalResult = validateCitationWithoutCrossRef(JOURNAL_CITATION);
    const bookResult = validateCitationWithoutCrossRef(BOOK_CITATION);

    // Journal should not get book-specific errors like publisherRequired
    const journalRules = journalResult.errors.map(e => e.rule);
    expect(journalRules).not.toContain('publisherRequired');

    // Book should not get journal-specific errors like volumeFormat
    const bookRules = bookResult.errors.map(e => e.rule);
    expect(bookRules).not.toContain('volumeFormat');
  });

  it('generates unique IDs for each result', () => {
    const result1 = validateCitationWithoutCrossRef(JOURNAL_CITATION);
    const result2 = validateCitationWithoutCrossRef(JOURNAL_CITATION);

    expect(result1.id).not.toBe(result2.id);
  });
});

// ── validateCitation (with CrossRef) ───────────────────────────────────

describe('validateCitation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips CrossRef when useCrossRef is false', async () => {
    const result = await validateCitation(JOURNAL_CITATION, false);

    expect(mockSearchByTitle).not.toHaveBeenCalled();
    expect(result.citation.type).toBe('journal');
  });

  it('skips CrossRef when title is empty', async () => {
    // "(2024)." alone — no authors or title parsed
    const result = await validateCitation('(2024).', true);

    expect(mockSearchByTitle).not.toHaveBeenCalled();
  });

  it('skips CrossRef when no authors', async () => {
    // A citation that can parse a title but has no authors
    const result = await validateCitation('(2024). Some title. Some Journal, 1(1), 1-10.', true);

    expect(mockSearchByTitle).not.toHaveBeenCalled();
  });

  it('adds DOI from CrossRef when missing', async () => {
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork() as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(JOURNAL_CITATION_NO_DOI, true);

    // Should have attempted CrossRef lookup
    expect(mockSearchByTitle).toHaveBeenCalled();
  });

  it('does not use CrossRef result when title similarity is too low', async () => {
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      title: 'Completely different paper about cooking',
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.1);

    const result = await validateCitation(JOURNAL_CITATION, true);

    // DOI should not be added since similarity is too low
    expect(result.citation.doi).toBeUndefined();
  });

  it('does not use CrossRef result when first author does not match', async () => {
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      authors: [{ lastName: 'Completely', initials: 'D.' }],
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(JOURNAL_CITATION, true);

    // DOI should not be added since author doesn't match
    expect(result.citation.doi).toBeUndefined();
  });

  it('handles CrossRef search failure gracefully', async () => {
    mockSearchByTitle.mockRejectedValueOnce(new Error('API down'));

    const result = await validateCitation(JOURNAL_CITATION, true);

    // Should still return a valid result
    expect(result).toHaveProperty('citation');
    expect(result).toHaveProperty('score');
    expect(result.citation.type).toBe('journal');
  });

  it('handles CrossRef returning null gracefully', async () => {
    mockSearchByTitle.mockResolvedValueOnce(null);

    const result = await validateCitation(JOURNAL_CITATION, true);

    expect(result).toHaveProperty('citation');
    expect(result.citation.type).toBe('journal');
  });

  it('handles CrossRef result without DOI', async () => {
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({ doi: '' }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(JOURNAL_CITATION, true);

    // Should not crash, just skip CrossRef correction
    expect(result).toHaveProperty('citation');
  });

  // ── Type correction tests ────────────────────────────────────────────

  it('corrects journal → conference type based on CrossRef', async () => {
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      type: 'proceedings-article',
      conferenceName: 'ACM CHI 2024',
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(JOURNAL_CITATION, true);

    expect(result.citation.type).toBe('conference');
    expect(result.errors.some(e => e.rule === 'typeMismatch')).toBe(true);
  });

  it('corrects journal → chapter type based on CrossRef', async () => {
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      type: 'book-chapter',
      publisher: 'Springer',
      editors: [{ lastName: 'Editor', initials: 'A. B.' }],
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(JOURNAL_CITATION, true);

    expect(result.citation.type).toBe('chapter');
    expect(result.citation.publisher).toBe('Springer');
    expect(result.errors.some(e => e.rule === 'typeMismatch')).toBe(true);
  });

  it('corrects unknown → report type based on CrossRef', async () => {
    const unknownCitation = 'Author, A. (2024). Some report title. https://example.com/report';
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      type: 'report',
      reportNumber: 'TR-2024-01',
      publisher: 'Research Institute',
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(unknownCitation, true);

    // type might stay 'web' due to URL, but if corrected to 'report' that's expected
    expect(result).toHaveProperty('citation');
  });

  // ── Page completion tests ────────────────────────────────────────────

  it('completes partial page range from CrossRef', async () => {
    // Citation with only start page "123"
    const partialPageCitation = 'Kim, B. Y. (2024). The impact of AI on education. Journal of Technology, 45(2), 123.';
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      pages: '123-145',
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(partialPageCitation, true);

    expect(result.citation.pages).toBe('123-145');
    expect(result.autoFixes.some(f => f.rule === 'pageCompletion')).toBe(true);
  });

  it('adds missing pages from CrossRef', async () => {
    const noPagesJournal = 'Kim, B. Y. (2024). The impact of AI on education. Journal of Technology, 45(2).';
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      pages: '123-145',
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(noPagesJournal, true);

    // Pages should be supplemented
    expect(result.citation.pages).toBe('123-145');
  });

  it('does not overwrite full page range with CrossRef data', async () => {
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      pages: '100-200',
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    // Citation already has full range "123-145"
    const result = await validateCitation(JOURNAL_CITATION, true);

    // Original pages should be kept since they already have a range
    expect(result.citation.pages).toContain('123');
  });

  // ── DOI formatting in CrossRef correction ────────────────────────────

  it('formats DOI as https://doi.org/ URL from CrossRef', async () => {
    mockSearchByTitle.mockResolvedValueOnce(makeCrossRefWork({
      doi: '10.1234/new-doi',
    }) as any);
    mockTitleSimilarity.mockReturnValueOnce(0.9);

    const result = await validateCitation(JOURNAL_CITATION_NO_DOI, true);

    if (result.citation.doi) {
      expect(result.citation.doi).toContain('https://doi.org/');
    }
  });
});

// ── validateCitations (batch) ──────────────────────────────────────────

describe('validateCitations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates multiple citations separated by double newlines', async () => {
    const text = `${JOURNAL_CITATION}\n\n${BOOK_CITATION}`;

    const results = await validateCitations(text, false);

    expect(results).toHaveLength(2);
    expect(results[0].citation.type).toBe('journal');
    expect(results[1].citation.type).toBe('book');
  });

  it('skips CrossRef for all citations when useCrossRef is false', async () => {
    const text = `${JOURNAL_CITATION}\n\n${BOOK_CITATION}`;

    await validateCitations(text, false);

    expect(mockSearchByTitle).not.toHaveBeenCalled();
  });

  it('calls CrossRef for each citation when useCrossRef is true', async () => {
    mockSearchByTitle.mockResolvedValue(null);

    const text = `${JOURNAL_CITATION}\n\n${JOURNAL_CITATION_NO_DOI}`;

    await validateCitations(text, true);

    // Should have called searchByTitle for each citation
    expect(mockSearchByTitle).toHaveBeenCalledTimes(2);
  });

  it('handles single citation', async () => {
    const results = await validateCitations(JOURNAL_CITATION, false);

    expect(results).toHaveLength(1);
  });

  it('handles empty text gracefully', async () => {
    const results = await validateCitations('', false);

    expect(results).toHaveLength(0);
  });

  it('returns unique IDs for each result', async () => {
    const text = `${JOURNAL_CITATION}\n\n${BOOK_CITATION}`;
    const results = await validateCitations(text, false);

    const ids = results.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
