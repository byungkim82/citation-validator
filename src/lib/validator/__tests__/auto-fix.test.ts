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

  it('reconstructs with fullDate', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Smith', initials: 'J.' }],
      year: '2024',
      fullDate: '2024, March 15',
      title: 'Talk title',
      source: '',
      type: 'conference',
      bracketType: 'Paper presentation',
      conferenceName: 'APA Conference, DC',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('(2024, March 15).');
    expect(result).toContain('[Paper presentation]');
    expect(result).toContain('APA Conference, DC.');
  });

  it('reconstructs with yearSuffix', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Smith', initials: 'J.' }],
      year: '2024',
      yearSuffix: 'a',
      title: 'First article',
      source: 'Journal',
      volume: '1',
      issue: '1',
      pages: '1\u201310',
      type: 'journal',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('(2024a).');
  });

  it('reconstructs a group author', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'World Health Organization', initials: '', isGroupAuthor: true }],
      year: '2024',
      title: 'Global health report',
      source: 'WHO Press',
      type: 'book',
      isGroupAuthor: true,
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('World Health Organization');
    expect(result).not.toContain(', .');
  });

  it('reconstructs a report', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Author', initials: 'A.' }],
      year: '2024',
      title: 'Safety review',
      source: '',
      type: 'report',
      reportNumber: 'DOT-HS-812-345',
      publisher: 'NHTSA',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('*Safety review* (Report No. DOT-HS-812-345).');
    expect(result).toContain('NHTSA.');
  });

  it('reconstructs a conference presentation', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Lee', initials: 'S.' }],
      year: '2023',
      fullDate: '2023, May 5',
      title: 'New findings',
      source: '',
      type: 'conference',
      bracketType: 'Poster session',
      conferenceName: 'Cognitive Science Conference, Berlin, Germany',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('(2023, May 5).');
    expect(result).toContain('New findings [Poster session].');
    expect(result).toContain('Cognitive Science Conference, Berlin, Germany.');
  });

  it('reconstructs a dissertation', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Johnson', initials: 'M.' }],
      year: '2023',
      title: 'Machine learning approaches',
      source: '',
      type: 'dissertation',
      bracketType: 'Doctoral dissertation, MIT',
      institution: 'MIT',
      databaseName: 'ProQuest Dissertations',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('*Machine learning approaches* [Doctoral dissertation, MIT].');
    expect(result).toContain('ProQuest Dissertations.');
  });

  it('reconstructs a book with edition', () => {
    const citation: ParsedCitation = {
      raw: '',
      authors: [{ lastName: 'Author', initials: 'A.' }],
      year: '2023',
      title: 'Psychology of learning',
      source: 'Psychology of learning',
      type: 'book',
      edition: '4',
      publisher: 'Academic Press',
    };

    const result = reconstructCitation(citation);
    expect(result).toContain('*Psychology of learning* (4th ed.).');
    expect(result).toContain('Academic Press.');
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
