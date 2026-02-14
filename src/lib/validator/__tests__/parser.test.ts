import { describe, it, expect } from 'vitest';
import { parseCitation, parseCitations } from '../parser';

describe('parseCitation', () => {
  it('parses a standard journal article', () => {
    const text = 'Kim, B. Y., & Lee, S. H. (2024). The impact of AI on education. Journal of Educational Technology, 45(2), 123-145.';
    const result = parseCitation(text);

    expect(result.authors).toHaveLength(2);
    expect(result.authors[0].lastName).toBe('Kim');
    expect(result.authors[0].initials).toBe('B. Y.');
    expect(result.authors[1].lastName).toBe('Lee');
    expect(result.authors[1].initials).toBe('S. H.');
    expect(result.year).toBe('2024');
    expect(result.title).toBe('The impact of AI on education');
    expect(result.source).toBe('Journal of Educational Technology');
    expect(result.volume).toBe('45');
    expect(result.issue).toBe('2');
    expect(result.pages).toBe('123-145');
    expect(result.type).toBe('journal');
  });

  it('parses a single author', () => {
    const text = 'Smith, J. A. (2020). Some title. Some Journal, 10(1), 1-20.';
    const result = parseCitation(text);

    expect(result.authors).toHaveLength(1);
    expect(result.authors[0].lastName).toBe('Smith');
    expect(result.authors[0].initials).toBe('J. A.');
  });

  it('parses three authors', () => {
    const text = 'Smith, J., Johnson, M., & Williams, R. (2023). Title here. Journal, 1(1), 1-10.';
    const result = parseCitation(text);

    expect(result.authors).toHaveLength(3);
    expect(result.authors[2].lastName).toBe('Williams');
  });

  it('extracts DOI from URL format', () => {
    const text = 'Author, A. (2024). Title. Journal, 1(1), 1-10. https://doi.org/10.1234/test';
    const result = parseCitation(text);

    expect(result.doi).toBe('10.1234/test');
    expect(result.url).toBe('https://doi.org/10.1234/test');
  });

  it('extracts DOI from doi: prefix format', () => {
    const text = 'Author, A. (2024). Title. Journal, 1(1), 1-10. doi:10.1234/test';
    const result = parseCitation(text);

    expect(result.doi).toBe('10.1234/test');
  });

  it('parses Vol./No./pp. prefixed format', () => {
    const text = 'Author, A. (2023). Title. Journal Name, Vol. 28(3), pp. 45-67.';
    const result = parseCitation(text);

    expect(result.source).toBe('Journal Name');
    expect(result.volume).toBe('Vol. 28');
    expect(result.pages).toBe('pp. 45-67');
    expect(result.type).toBe('journal');
  });

  it('parses book chapter with In prefix', () => {
    const text = 'Author, A. (2023). Chapter title. In Book Title (pp. 20-31). Publisher.';
    const result = parseCitation(text);

    expect(result.type).toBe('chapter');
    expect(result.source).toContain('In');
    expect(result.pages).toBe('20-31');
  });

  it('handles citation with no year', () => {
    const text = 'This is just some random text without a year.';
    const result = parseCitation(text);

    expect(result.year).toBe('');
    expect(result.title).toBe(text);
  });

  it('handles accented characters in author names', () => {
    const text = 'García, M. A. (2024). Title. Journal, 1(1), 1-10.';
    const result = parseCitation(text);

    expect(result.authors[0].lastName).toBe('García');
  });

  it('handles hyphenated author names', () => {
    const text = 'Smith-Jones, A. B. (2024). Title. Journal, 1(1), 1-10.';
    const result = parseCitation(text);

    expect(result.authors[0].lastName).toBe('Smith-Jones');
  });

  it('handles URL-only citations as web type', () => {
    const text = 'Author, A. (2024). Web page title. https://example.com/page';
    const result = parseCitation(text);

    expect(result.type).toBe('web');
    expect(result.url).toBe('https://example.com/page');
  });

  // ── Date variation tests ──────────────────────────────────────────

  it('parses (n.d.) as year', () => {
    const text = 'Author, A. (n.d.). Some title. Some Publisher.';
    const result = parseCitation(text);

    expect(result.year).toBe('n.d.');
  });

  it('parses (in press) as year', () => {
    const text = 'Author, A. (in press). Some title. Some Journal, 10(1), 1-20.';
    const result = parseCitation(text);

    expect(result.year).toBe('in press');
  });

  it('parses year with suffix (2024a)', () => {
    const text = 'Author, A. (2024a). First article. Journal, 1(1), 1-10.';
    const result = parseCitation(text);

    expect(result.year).toBe('2024');
    expect(result.yearSuffix).toBe('a');
  });

  it('parses full date (2024, March 15)', () => {
    const text = 'Author, A. (2024, March 15). Conference talk title [Paper presentation]. Conference Name, City, Country.';
    const result = parseCitation(text);

    expect(result.year).toBe('2024');
    expect(result.fullDate).toBe('2024, March 15');
  });

  it('parses date range (2024, August 5-8)', () => {
    const text = 'Author, A. (2024, August 5-8). Talk title [Paper presentation]. Conference, City.';
    const result = parseCitation(text);

    expect(result.year).toBe('2024');
    expect(result.fullDate).toBe('2024, August 5-8');
  });

  it('parses seasonal date (2024, Spring)', () => {
    const text = 'Author, A. (2024, Spring). Magazine article. Magazine Title.';
    const result = parseCitation(text);

    expect(result.year).toBe('2024');
    expect(result.fullDate).toBe('2024, Spring');
  });

  // ── Group/organizational author tests ─────────────────────────────

  it('parses group/organizational author', () => {
    const text = 'World Health Organization. (2024). Global health report. WHO Press.';
    const result = parseCitation(text);

    expect(result.authors).toHaveLength(1);
    expect(result.authors[0].lastName).toBe('World Health Organization');
    expect(result.authors[0].initials).toBe('');
    expect(result.authors[0].isGroupAuthor).toBe(true);
    expect(result.isGroupAuthor).toBe(true);
  });

  it('parses group author with acronym-style name', () => {
    const text = 'American Psychological Association. (2020). Publication manual. APA.';
    const result = parseCitation(text);

    expect(result.authors[0].isGroupAuthor).toBe(true);
    expect(result.authors[0].lastName).toBe('American Psychological Association');
  });

  // ── Report (10.4) tests ───────────────────────────────────────────

  it('parses report with Report No.', () => {
    const text = 'Author, A. (2024). Annual safety review (Report No. DOT-HS-812-345). National Highway Traffic Safety Administration.';
    const result = parseCitation(text);

    expect(result.type).toBe('report');
    expect(result.reportNumber).toBe('DOT-HS-812-345');
  });

  // ── Conference (10.5) tests ───────────────────────────────────────

  it('parses conference paper presentation', () => {
    const text = 'Smith, J. (2024, March 15). New findings in AI [Paper presentation]. Annual Conference of APA, Washington, DC, United States.';
    const result = parseCitation(text);

    expect(result.type).toBe('conference');
    expect(result.bracketType).toBe('Paper presentation');
    expect(result.conferenceName).toBe('Annual Conference of APA, Washington, DC, United States');
    expect(result.fullDate).toBe('2024, March 15');
  });

  it('parses poster session', () => {
    const text = 'Lee, S. (2023, May 5). Poster about cognition [Poster session]. Cognitive Science Conference, Berlin, Germany.';
    const result = parseCitation(text);

    expect(result.type).toBe('conference');
    expect(result.bracketType).toBe('Poster session');
  });

  // ── Dissertation (10.6) tests ─────────────────────────────────────

  it('parses doctoral dissertation', () => {
    const text = 'Johnson, M. (2023). Machine learning approaches [Doctoral dissertation, Massachusetts Institute of Technology]. ProQuest Dissertations.';
    const result = parseCitation(text);

    expect(result.type).toBe('dissertation');
    expect(result.bracketType).toBe('Doctoral dissertation, Massachusetts Institute of Technology');
    expect(result.institution).toBe('Massachusetts Institute of Technology');
    expect(result.databaseName).toBe('ProQuest Dissertations');
  });

  it("parses master's thesis", () => {
    const text = "Park, H. (2022). Analysis of urban patterns [Master's thesis, Seoul National University]. University Repository.";
    const result = parseCitation(text);

    expect(result.type).toBe('dissertation');
    expect(result.institution).toBe('Seoul National University');
  });

  // ── Book enhancement tests ────────────────────────────────────────

  it('parses book with edition', () => {
    const text = 'Author, A. (2023). Psychology of learning (4th ed.). Academic Press.';
    const result = parseCitation(text);

    expect(result.type).toBe('book');
    expect(result.edition).toBe('4');
    expect(result.publisher).toBe('Academic Press');
  });
});

describe('parseCitations', () => {
  it('splits multiple citations by double newline', () => {
    const text = 'Author, A. (2024). Title one. Journal, 1(1), 1-10.\n\nAuthor, B. (2023). Title two. Journal, 2(1), 20-30.';
    const results = parseCitations(text);

    expect(results).toHaveLength(2);
    expect(results[0].year).toBe('2024');
    expect(results[1].year).toBe('2023');
  });

  it('handles single citation', () => {
    const text = 'Author, A. (2024). Title. Journal, 1(1), 1-10.';
    const results = parseCitations(text);

    expect(results).toHaveLength(1);
  });

  it('ignores empty lines between citations', () => {
    const text = 'Author, A. (2024). Title one. J, 1(1), 1.\n\n\n\nAuthor, B. (2023). Title two. J, 2(1), 2.';
    const results = parseCitations(text);

    expect(results).toHaveLength(2);
  });
});
