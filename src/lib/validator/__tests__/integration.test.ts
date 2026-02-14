import { describe, it, expect } from 'vitest';
import { validateCitationWithoutCrossRef } from '../index';

describe('Integration: end-to-end validation', () => {
  // ── Journal (10.1) ──────────────────────────────────────────────────

  it('correct journal article scores high', () => {
    const text = 'Kim, B. Y., & Lee, S. H. (2024). The impact of AI on education. Journal of Educational Technology, 45(2), 123–145. https://doi.org/10.1234/test';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.type).toBe('journal');
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('journal with errors gets lower score', () => {
    const text = 'Kim, BY and Lee, SH (2024). The Impact Of AI On Education. journal of educational technology, Vol. 45, No. 2, pp. 123-145';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.type).toBe('journal');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(90);
  });

  // ── Book (10.2) ─────────────────────────────────────────────────────

  it('correct book citation validates', () => {
    const text = 'Author, A. B. (2023). Psychology of learning (4th ed.). Academic Press.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.type).toBe('book');
    expect(result.citation.edition).toBe('4');
  });

  // ── Chapter (10.3) ──────────────────────────────────────────────────

  it('correct chapter citation validates', () => {
    const text = 'Author, A. (2023). Chapter title. In Editor, E. (Ed.), Book Title (pp. 20–31). Publisher.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.type).toBe('chapter');
    expect(result.citation.pages).toBe('20–31');
  });

  // ── Report (10.4) ──────────────────────────────────────────────────

  it('report with report number is detected', () => {
    const text = 'National Highway Traffic Safety Administration. (2024). Annual safety review (Report No. DOT-HS-812-345). U.S. Department of Transportation.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.type).toBe('report');
    expect(result.citation.reportNumber).toBe('DOT-HS-812-345');
    expect(result.citation.isGroupAuthor).toBe(true);
  });

  // ── Conference (10.5) ──────────────────────────────────────────────

  it('conference presentation is fully parsed and validated', () => {
    const text = 'Smith, J. A. (2024, March 15). New findings in AI research [Paper presentation]. Annual Conference of APA, Washington, DC, United States. https://doi.org/10.1234/conf';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.type).toBe('conference');
    expect(result.citation.bracketType).toBe('Paper presentation');
    expect(result.citation.conferenceName).toBe('Annual Conference of APA, Washington, DC, United States');
    expect(result.citation.fullDate).toBe('2024, March 15');
  });

  it('conference without full date gets warning', () => {
    const text = 'Smith, J. A. (2024). New findings [Paper presentation]. Annual Conference, City.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.type).toBe('conference');
    expect(result.errors.some(e => e.rule === 'fullDateRequired')).toBe(true);
  });

  // ── Dissertation (10.6) ────────────────────────────────────────────

  it('doctoral dissertation is fully parsed and validated', () => {
    const text = 'Johnson, M. L. (2023). Machine learning approaches to natural language [Doctoral dissertation, Massachusetts Institute of Technology]. ProQuest Dissertations.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.type).toBe('dissertation');
    expect(result.citation.institution).toBe('Massachusetts Institute of Technology');
    expect(result.citation.databaseName).toBe('ProQuest Dissertations');
  });

  // ── Date variations ────────────────────────────────────────────────

  it('n.d. year does not produce year format error', () => {
    const text = 'Author, A. (n.d.). Some undated work. Publisher.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.year).toBe('n.d.');
    expect(result.errors.some(e => e.rule === 'yearFormat')).toBe(false);
  });

  it('in press year does not produce year format error', () => {
    const text = 'Author, A. (in press). Forthcoming article. Journal of Studies, 10(1), 1–20.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.year).toBe('in press');
    expect(result.errors.some(e => e.rule === 'yearFormat')).toBe(false);
  });

  it('year suffix (2024a) does not produce year format error', () => {
    const text = 'Author, A. (2024a). First article of the year. Journal, 1(1), 1–10.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.year).toBe('2024');
    expect(result.citation.yearSuffix).toBe('a');
    expect(result.errors.some(e => e.rule === 'yearFormat')).toBe(false);
  });

  // ── Group author ───────────────────────────────────────────────────

  it('group author does not produce initials error', () => {
    const text = 'World Health Organization. (2024). Global health report. WHO Press.';
    const result = validateCitationWithoutCrossRef(text);

    expect(result.citation.isGroupAuthor).toBe(true);
    expect(result.errors.some(e => e.rule === 'authorFormat' && e.message.includes('initials'))).toBe(false);
  });
});
