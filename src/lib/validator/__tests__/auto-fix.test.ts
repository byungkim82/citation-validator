import { describe, it, expect } from 'vitest';
import { applyAutoFixes, reconstructCitation, calculateScore } from '../auto-fix';
import type { ParsedCitation, ValidationError } from '../../types';

describe('reconstructCitation', () => {
  it('reconstructs a journal article', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [
        { lastName: 'Kim', initials: 'B. Y.' },
        { lastName: 'Lee', initials: 'S. H.' },
      ],
      year: '2024',
      title: 'The impact of AI on education',
      source: 'Journal of Educational Technology',
      volume: '45',
      issue: '2',
      pages: '123\u2013145',
      doi: 'https://doi.org/10.1234/test',
      type: 'journal',
    };

    const result = reconstructCitation(citation);

    expect(result).toContain('Kim, B. Y., & Lee, S. H.');
    expect(result).toContain('(2024).');
    expect(result).toContain('The impact of AI on education.');
    expect(result).toContain('*Journal of Educational Technology*');
    expect(result).toContain('*45*(2)');
    expect(result).toContain('123\u2013145');
    expect(result).toContain('https://doi.org/10.1234/test');
  });

  it('reconstructs a single author', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Smith', initials: 'J.' }],
      year: '2024',
      title: 'Title',
      source: 'Journal',
      type: 'journal',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('Smith, J.');
    expect(result).not.toContain('&');
  });

  it('reconstructs three authors with ampersand', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [
        { lastName: 'A', initials: 'X.' },
        { lastName: 'B', initials: 'Y.' },
        { lastName: 'C', initials: 'Z.' },
      ],
      year: '2024',
      title: 'Title',
      source: 'Journal',
      type: 'journal',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('A, X., B, Y., & C, Z.');
  });

  it('reconstructs a book chapter', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Author', initials: 'A.' }],
      year: '2024',
      title: 'Chapter title',
      source: 'In Book Title',
      pages: '20\u201331',
      publisher: 'Publisher',
      type: 'chapter',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('In');
    expect(result).toContain('pp. 20\u201331');
    expect(result).toContain('Publisher.');
  });
});

describe('calculateScore', () => {
  it('returns 100 for no errors', () => {
    expect(calculateScore([], [])).toBe(100);
  });

  it('deducts 15 per error', () => {
    const errors: ValidationError[] = [
      { rule: 'test', field: 'test', message: '', severity: 'error', original: '', autoFixable: false },
    ];
    expect(calculateScore(errors, [])).toBe(85);
  });

  it('deducts 10 per warning', () => {
    const errors: ValidationError[] = [
      { rule: 'test', field: 'test', message: '', severity: 'warning', original: '', autoFixable: false },
    ];
    expect(calculateScore(errors, [])).toBe(90);
  });

  it('adds back half points for auto-fixed errors', () => {
    const errors: ValidationError[] = [
      { rule: 'titleCase', field: 'title', message: '', severity: 'warning', original: '', autoFixable: true },
    ];
    const fixes = [{ rule: 'titleCase', field: 'title', original: '', fixed: '', description: '' }];
    // 100 - 10 (warning) + 5 (half back) = 95
    expect(calculateScore(errors, fixes)).toBe(95);
  });

  it('never goes below 0', () => {
    const errors: ValidationError[] = Array(10).fill({
      rule: 'test', field: 'test', message: '', severity: 'error', original: '', autoFixable: false,
    });
    expect(calculateScore(errors, [])).toBe(0);
  });

  it('never exceeds 100', () => {
    expect(calculateScore([], [])).toBeLessThanOrEqual(100);
  });
});

describe('applyAutoFixes', () => {
  it('fixes title case', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Smith', initials: 'J.' }],
      year: '2024',
      title: 'The Impact Of AI',
      source: 'Journal',
      type: 'journal',
    };
    const errors: ValidationError[] = [
      {
        rule: 'titleCase',
        field: 'title',
        message: 'Title should use sentence case',
        severity: 'warning',
        original: 'The Impact Of AI',
        suggested: 'The impact of AI',
        autoFixable: true,
      },
    ];

    const { autoFixes, fixedCitation } = applyAutoFixes(citation, errors);
    expect(autoFixes).toHaveLength(1);
    expect(autoFixes[0].rule).toBe('titleCase');
    expect(fixedCitation).toContain('The impact of AI');
  });

  it('fixes DOI format', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Smith', initials: 'J.' }],
      year: '2024',
      title: 'Title',
      source: 'Journal',
      doi: 'doi:10.1234/test',
      type: 'journal',
    };
    const errors: ValidationError[] = [
      {
        rule: 'doiFormat',
        field: 'doi',
        message: 'DOI should use format https://doi.org/...',
        severity: 'error',
        original: 'doi:10.1234/test',
        suggested: 'https://doi.org/10.1234/test',
        autoFixable: true,
      },
    ];

    const { autoFixes, fixedCitation } = applyAutoFixes(citation, errors);
    expect(autoFixes).toHaveLength(1);
    expect(fixedCitation).toContain('https://doi.org/10.1234/test');
  });

  it('creates manual fixes for non-auto-fixable errors', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [],
      year: '2024',
      title: 'Title',
      source: 'Journal',
      type: 'journal',
    };
    const errors: ValidationError[] = [
      {
        rule: 'doiPresence',
        field: 'doi',
        message: 'DOI should be included',
        severity: 'warning',
        original: '',
        autoFixable: false,
      },
    ];

    const { manualFixes } = applyAutoFixes(citation, errors);
    expect(manualFixes).toHaveLength(1);
    expect(manualFixes[0].rule).toBe('doiPresence');
  });
});
