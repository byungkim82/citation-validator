import { describe, it, expect } from 'vitest';
import {
  checkAuthorFormat,
  checkYearFormat,
  checkTitleCase,
  checkDOIPresence,
  checkDOIFormat,
  checkVolumeIssueFormat,
  checkPageFormat,
  checkAmpersand,
  checkJournalNameCase,
  checkConferenceNameCase,
  checkChapterEditors,
  checkTerminalPeriod,
  checkFullDateRequired,
  checkPublisherRequired,
  checkEditionFormat,
  checkPublisherLocation,
  checkInPrefix,
  checkBracketType,
  checkConferenceInfo,
  checkDissertationInfo,
  checkReportNumber,
  getRulesForType,
  toSentenceCase,
  toTitleCase,
  isLikelyTitleCase,
} from '../rules';
import type { ParsedCitation } from '../../types';

function makeCitation(overrides: Partial<ParsedCitation> = {}): ParsedCitation {
  return {
    raw: '',
    authors: [],
    year: '2024',
    title: 'Some title',
    source: '',
    type: 'journal',
    ...overrides,
  };
}

describe('checkAuthorFormat', () => {
  it('passes correct initials', () => {
    const citation = makeCitation({
      authors: [{ lastName: 'Kim', initials: 'B. Y.' }],
    });
    expect(checkAuthorFormat(citation)).toHaveLength(0);
  });

  it('flags missing initials', () => {
    const citation = makeCitation({
      authors: [{ lastName: 'Kim', initials: '' }],
    });
    const errors = checkAuthorFormat(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
    expect(errors[0].autoFixable).toBe(false);
  });

  it('flags missing last name', () => {
    const citation = makeCitation({
      authors: [{ lastName: '', initials: 'A.' }],
    });
    const errors = checkAuthorFormat(citation);
    expect(errors.some(e => e.message.includes('missing last name'))).toBe(true);
  });
});

describe('checkYearFormat', () => {
  it('passes valid year', () => {
    expect(checkYearFormat(makeCitation({ year: '2024' }))).toHaveLength(0);
  });

  it('flags missing year', () => {
    const errors = checkYearFormat(makeCitation({ year: '' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
  });

  it('flags non-4-digit year', () => {
    const errors = checkYearFormat(makeCitation({ year: '24' }));
    expect(errors).toHaveLength(1);
  });
});

describe('checkTitleCase', () => {
  it('passes sentence case title', () => {
    const citation = makeCitation({ title: 'The impact of AI on education' });
    expect(checkTitleCase(citation)).toHaveLength(0);
  });

  it('flags Title Case title', () => {
    const citation = makeCitation({ title: 'The Impact Of Artificial Intelligence On Higher Education' });
    const errors = checkTitleCase(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].autoFixable).toBe(true);
  });

  it('flags missing title', () => {
    const errors = checkTitleCase(makeCitation({ title: '' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].autoFixable).toBe(false);
  });
});

describe('checkDOIPresence', () => {
  it('warns when journal article has no DOI', () => {
    const citation = makeCitation({ type: 'journal' });
    const errors = checkDOIPresence(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('warning');
  });

  it('passes when journal has DOI', () => {
    const citation = makeCitation({ type: 'journal', doi: 'https://doi.org/10.1234/test' });
    expect(checkDOIPresence(citation)).toHaveLength(0);
  });

  it('does not warn for non-journal types', () => {
    const citation = makeCitation({ type: 'book' });
    expect(checkDOIPresence(citation)).toHaveLength(0);
  });
});

describe('checkDOIFormat', () => {
  it('passes correct DOI URL', () => {
    const citation = makeCitation({ doi: 'https://doi.org/10.1234/test' });
    expect(checkDOIFormat(citation)).toHaveLength(0);
  });

  it('flags doi: prefix format', () => {
    const citation = makeCitation({ doi: 'doi:10.1234/test' });
    const errors = checkDOIFormat(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].suggested).toBe('https://doi.org/10.1234/test');
    expect(errors[0].autoFixable).toBe(true);
  });

  it('flags bare DOI number', () => {
    const citation = makeCitation({ doi: '10.1234/test' });
    const errors = checkDOIFormat(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].suggested).toBe('https://doi.org/10.1234/test');
  });

  it('flags trailing period', () => {
    const citation = makeCitation({ doi: 'https://doi.org/10.1234/test.' });
    const errors = checkDOIFormat(citation);
    expect(errors.some(e => e.message.includes('period'))).toBe(true);
  });

  it('skips when no DOI', () => {
    expect(checkDOIFormat(makeCitation())).toHaveLength(0);
  });
});

describe('checkVolumeIssueFormat', () => {
  it('flags Vol. prefix', () => {
    const citation = makeCitation({ volume: 'Vol. 28' });
    const errors = checkVolumeIssueFormat(citation);
    expect(errors.some(e => e.rule === 'volumeFormat')).toBe(true);
    expect(errors.find(e => e.rule === 'volumeFormat')?.suggested).toBe('28');
  });

  it('flags No. prefix', () => {
    const citation = makeCitation({ issue: 'No. 3' });
    const errors = checkVolumeIssueFormat(citation);
    expect(errors.some(e => e.rule === 'issueFormat')).toBe(true);
  });

  it('passes clean volume', () => {
    const citation = makeCitation({ volume: '28' });
    expect(checkVolumeIssueFormat(citation)).toHaveLength(0);
  });
});

describe('checkPageFormat', () => {
  it('flags pp. prefix for journal articles', () => {
    const citation = makeCitation({ type: 'journal', pages: 'pp. 45-67' });
    const errors = checkPageFormat(citation);
    expect(errors.some(e => e.message.includes('pp.'))).toBe(true);
  });

  it('flags hyphen instead of en dash', () => {
    const citation = makeCitation({ pages: '45-67' });
    const errors = checkPageFormat(citation);
    expect(errors.some(e => e.message.includes('en dash'))).toBe(true);
    expect(errors.find(e => e.message.includes('en dash'))?.suggested).toBe('45\u201367');
  });

  it('passes en dash pages', () => {
    const citation = makeCitation({ pages: '45\u201367' });
    expect(checkPageFormat(citation)).toHaveLength(0);
  });
});

describe('checkAmpersand', () => {
  it('flags "and" in author block', () => {
    const citation = makeCitation({
      raw: 'Smith, J. and Lee, S. (2024). Title. Journal, 1(1), 1-10.',
      authors: [
        { lastName: 'Smith', initials: 'J.' },
        { lastName: 'Lee', initials: 'S.' },
      ],
    });
    const errors = checkAmpersand(citation);
    expect(errors.some(e => e.rule === 'ampersand')).toBe(true);
  });

  it('passes single author', () => {
    const citation = makeCitation({
      authors: [{ lastName: 'Smith', initials: 'J.' }],
    });
    expect(checkAmpersand(citation)).toHaveLength(0);
  });
});

describe('checkJournalNameCase', () => {
  it('flags lowercase journal name', () => {
    const citation = makeCitation({
      type: 'journal',
      source: 'journal of educational psychology',
    });
    const errors = checkJournalNameCase(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].autoFixable).toBe(true);
  });

  it('passes Title Case journal name', () => {
    const citation = makeCitation({
      type: 'journal',
      source: 'Journal of Educational Psychology',
    });
    expect(checkJournalNameCase(citation)).toHaveLength(0);
  });
});

describe('checkConferenceNameCase', () => {
  it('flags lowercase conference name', () => {
    const citation = makeCitation({
      type: 'chapter',
      source: 'In proceedings of the international conference',
    });
    const errors = checkConferenceNameCase(citation);
    expect(errors).toHaveLength(1);
  });
});

describe('checkChapterEditors', () => {
  it('warns when chapter has no editors', () => {
    const citation = makeCitation({ type: 'chapter' });
    const errors = checkChapterEditors(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('warning');
  });

  it('passes when chapter has editors', () => {
    const citation = makeCitation({
      type: 'chapter',
      editors: [{ lastName: 'Smith', initials: 'J.' }],
    });
    expect(checkChapterEditors(citation)).toHaveLength(0);
  });
});

describe('toSentenceCase', () => {
  it('converts Title Case to sentence case', () => {
    expect(toSentenceCase('The Impact of AI on Education')).toBe('The impact of AI on education');
  });

  it('preserves acronyms', () => {
    expect(toSentenceCase('Using NLP in AI Research')).toBe('Using NLP in AI research');
  });

  it('capitalizes after colon', () => {
    expect(toSentenceCase('Main Title: A Subtitle Here')).toBe('Main title: A subtitle here');
  });
});

describe('toTitleCase', () => {
  it('capitalizes major words', () => {
    expect(toTitleCase('journal of educational psychology')).toBe('Journal of Educational Psychology');
  });

  it('keeps minor words lowercase', () => {
    const result = toTitleCase('the journal of the american medical association');
    expect(result).toBe('The Journal of the American Medical Association');
  });
});

describe('isLikelyTitleCase', () => {
  it('detects Title Case', () => {
    expect(isLikelyTitleCase('The Impact Of Artificial Intelligence On Higher Education')).toBe(true);
  });

  it('rejects sentence case', () => {
    expect(isLikelyTitleCase('The impact of artificial intelligence on higher education')).toBe(false);
  });
});

// ── New rules tests ─────────────────────────────────────────────────

describe('checkAuthorFormat (group authors)', () => {
  it('passes group author with name only', () => {
    const citation = makeCitation({
      authors: [{ lastName: 'World Health Organization', initials: '', isGroupAuthor: true }],
      isGroupAuthor: true,
    });
    expect(checkAuthorFormat(citation)).toHaveLength(0);
  });

  it('flags group author with empty name', () => {
    const citation = makeCitation({
      authors: [{ lastName: '', initials: '', isGroupAuthor: true }],
      isGroupAuthor: true,
    });
    const errors = checkAuthorFormat(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('organization name');
  });
});

describe('checkYearFormat (extended)', () => {
  it('passes n.d.', () => {
    expect(checkYearFormat(makeCitation({ year: 'n.d.' }))).toHaveLength(0);
  });

  it('passes in press', () => {
    expect(checkYearFormat(makeCitation({ year: 'in press' }))).toHaveLength(0);
  });

  it('passes standard 4-digit year', () => {
    expect(checkYearFormat(makeCitation({ year: '2024' }))).toHaveLength(0);
  });

  it('flags invalid year text', () => {
    const errors = checkYearFormat(makeCitation({ year: 'sometime' }));
    expect(errors).toHaveLength(1);
  });
});

describe('checkTerminalPeriod', () => {
  it('passes citation ending with period', () => {
    const citation = makeCitation({ raw: 'Author, A. (2024). Title. Journal, 1(1), 1-10.' });
    expect(checkTerminalPeriod(citation)).toHaveLength(0);
  });

  it('passes citation ending with DOI URL', () => {
    const citation = makeCitation({ raw: 'Author, A. (2024). Title. https://doi.org/10.1234/test' });
    expect(checkTerminalPeriod(citation)).toHaveLength(0);
  });

  it('flags citation not ending with period or URL', () => {
    const citation = makeCitation({ raw: 'Author, A. (2024). Title. Journal, 1(1), 1-10' });
    const errors = checkTerminalPeriod(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('warning');
    expect(errors[0].autoFixable).toBe(true);
  });
});

describe('checkFullDateRequired', () => {
  it('warns conference without full date', () => {
    const citation = makeCitation({ type: 'conference', year: '2024' });
    const errors = checkFullDateRequired(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('warning');
  });

  it('passes conference with full date', () => {
    const citation = makeCitation({ type: 'conference', year: '2024', fullDate: '2024, March 15' });
    expect(checkFullDateRequired(citation)).toHaveLength(0);
  });

  it('does not apply to journal type', () => {
    const citation = makeCitation({ type: 'journal' });
    expect(checkFullDateRequired(citation)).toHaveLength(0);
  });
});

describe('checkPublisherRequired', () => {
  it('flags book without publisher or source', () => {
    const citation = makeCitation({ type: 'book', source: '' });
    const errors = checkPublisherRequired(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
  });

  it('passes book with source', () => {
    const citation = makeCitation({ type: 'book', source: 'Academic Press' });
    expect(checkPublisherRequired(citation)).toHaveLength(0);
  });

  it('flags report without publisher', () => {
    const citation = makeCitation({ type: 'report', source: '' });
    const errors = checkPublisherRequired(citation);
    expect(errors).toHaveLength(1);
  });

  it('does not apply to journal type', () => {
    const citation = makeCitation({ type: 'journal', source: '' });
    expect(checkPublisherRequired(citation)).toHaveLength(0);
  });
});

describe('checkEditionFormat', () => {
  it('passes numeric edition', () => {
    const citation = makeCitation({ type: 'book', edition: '3' });
    expect(checkEditionFormat(citation)).toHaveLength(0);
  });

  it('flags non-numeric edition', () => {
    const citation = makeCitation({ type: 'book', edition: 'third' });
    const errors = checkEditionFormat(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
  });

  it('passes when no edition', () => {
    expect(checkEditionFormat(makeCitation({ type: 'book' }))).toHaveLength(0);
  });
});

describe('checkPublisherLocation', () => {
  it('warns about City, ST: prefix in publisher', () => {
    const citation = makeCitation({ type: 'book', publisher: 'New York, NY: Academic Press' });
    const errors = checkPublisherLocation(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('warning');
    expect(errors[0].autoFixable).toBe(true);
    expect(errors[0].suggested).toBe('Academic Press');
  });

  it('passes publisher without location', () => {
    const citation = makeCitation({ type: 'book', publisher: 'Academic Press' });
    expect(checkPublisherLocation(citation)).toHaveLength(0);
  });
});

describe('checkInPrefix', () => {
  it('flags chapter source without In prefix', () => {
    const citation = makeCitation({ type: 'chapter', source: 'Book Title' });
    const errors = checkInPrefix(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
    expect(errors[0].autoFixable).toBe(true);
    expect(errors[0].suggested).toBe('In Book Title');
  });

  it('passes chapter source with In prefix', () => {
    const citation = makeCitation({ type: 'chapter', source: 'In Book Title' });
    expect(checkInPrefix(citation)).toHaveLength(0);
  });
});

describe('checkBracketType', () => {
  it('flags conference without bracket type', () => {
    const citation = makeCitation({ type: 'conference' });
    const errors = checkBracketType(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
  });

  it('passes conference with bracket type', () => {
    const citation = makeCitation({ type: 'conference', bracketType: 'Paper presentation' });
    expect(checkBracketType(citation)).toHaveLength(0);
  });

  it('flags dissertation without bracket type', () => {
    const citation = makeCitation({ type: 'dissertation' });
    const errors = checkBracketType(citation);
    expect(errors).toHaveLength(1);
  });

  it('does not apply to journal type', () => {
    expect(checkBracketType(makeCitation({ type: 'journal' }))).toHaveLength(0);
  });
});

describe('checkConferenceInfo', () => {
  it('flags conference without conference name', () => {
    const citation = makeCitation({ type: 'conference' });
    const errors = checkConferenceInfo(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
  });

  it('passes conference with conference name', () => {
    const citation = makeCitation({ type: 'conference', conferenceName: 'Annual APA Conference, DC' });
    expect(checkConferenceInfo(citation)).toHaveLength(0);
  });
});

describe('checkDissertationInfo', () => {
  it('flags dissertation without institution', () => {
    const citation = makeCitation({ type: 'dissertation' });
    const errors = checkDissertationInfo(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('error');
  });

  it('passes dissertation with institution', () => {
    const citation = makeCitation({ type: 'dissertation', institution: 'MIT' });
    expect(checkDissertationInfo(citation)).toHaveLength(0);
  });
});

describe('checkReportNumber', () => {
  it('info when report has no report number', () => {
    const citation = makeCitation({ type: 'report' });
    const errors = checkReportNumber(citation);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe('info');
  });

  it('passes report with report number', () => {
    const citation = makeCitation({ type: 'report', reportNumber: '2024-01' });
    expect(checkReportNumber(citation)).toHaveLength(0);
  });
});

describe('getRulesForType (routing)', () => {
  it('journal rules include volumeIssueFormat but not bracketType', () => {
    const rules = getRulesForType('journal');
    const ruleNames = rules.map(r => r.name);
    expect(ruleNames).toContain('checkVolumeIssueFormat');
    expect(ruleNames).not.toContain('checkBracketType');
    expect(ruleNames).not.toContain('checkDissertationInfo');
  });

  it('conference rules include bracketType and conferenceInfo', () => {
    const rules = getRulesForType('conference');
    const ruleNames = rules.map(r => r.name);
    expect(ruleNames).toContain('checkBracketType');
    expect(ruleNames).toContain('checkConferenceInfo');
    expect(ruleNames).not.toContain('checkVolumeIssueFormat');
  });

  it('dissertation rules include dissertationInfo but not conferenceInfo', () => {
    const rules = getRulesForType('dissertation');
    const ruleNames = rules.map(r => r.name);
    expect(ruleNames).toContain('checkDissertationInfo');
    expect(ruleNames).toContain('checkBracketType');
    expect(ruleNames).not.toContain('checkConferenceInfo');
  });

  it('report rules include reportNumber and publisherRequired', () => {
    const rules = getRulesForType('report');
    const ruleNames = rules.map(r => r.name);
    expect(ruleNames).toContain('checkReportNumber');
    expect(ruleNames).toContain('checkPublisherRequired');
  });

  it('all types get universal rules', () => {
    for (const type of ['journal', 'book', 'chapter', 'conference', 'dissertation', 'report'] as const) {
      const rules = getRulesForType(type);
      const ruleNames = rules.map(r => r.name);
      expect(ruleNames).toContain('checkAuthorFormat');
      expect(ruleNames).toContain('checkYearFormat');
      expect(ruleNames).toContain('checkTitleCase');
    }
  });
});
