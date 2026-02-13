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
