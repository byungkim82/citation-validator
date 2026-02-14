import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeTitle, titleSimilarity, parseCrossRefResponse, searchByTitle, lookupByDOI, findDOI } from '../client';

describe('normalizeTitle', () => {
  it('lowercases and removes punctuation', () => {
    expect(normalizeTitle('Hello, World!')).toBe('hello world');
  });

  it('normalizes whitespace', () => {
    expect(normalizeTitle('  multiple   spaces  ')).toBe('multiple spaces');
  });

  it('handles colons and special chars', () => {
    expect(normalizeTitle('Title: A Subtitle')).toBe('title a subtitle');
  });
});

describe('titleSimilarity', () => {
  it('returns 1 for identical titles', () => {
    expect(titleSimilarity('Machine Learning in NLP', 'Machine Learning in NLP')).toBe(1);
  });

  it('returns 0 for completely different titles', () => {
    expect(titleSimilarity('Quantum Physics Theory', 'Cooking Italian Pasta')).toBe(0);
  });

  it('returns high similarity for minor differences', () => {
    const sim = titleSimilarity(
      'The Impact of Artificial Intelligence on Education',
      'Impact of Artificial Intelligence on Higher Education'
    );
    expect(sim).toBeGreaterThan(0.5);
  });

  it('returns 0 for empty strings', () => {
    expect(titleSimilarity('', 'Some title')).toBe(0);
    expect(titleSimilarity('Some title', '')).toBe(0);
  });

  it('ignores short words (<=3 chars)', () => {
    // Only long words are compared
    expect(titleSimilarity('a the in on', 'b for at by')).toBe(0);
  });
});

describe('parseCrossRefResponse', () => {
  it('parses a typical CrossRef work item', () => {
    const item = {
      DOI: '10.1234/test',
      title: ['Machine Learning in NLP'],
      author: [
        { family: 'Smith', given: 'John Andrew' },
        { family: 'Lee', given: 'Sue' },
      ],
      'published-print': { 'date-parts': [[2024]] },
      'container-title': ['Journal of Computer Science'],
      volume: '45',
      issue: '2',
      page: '123-145',
      type: 'journal-article',
      publisher: 'Academic Press',
    };

    const result = parseCrossRefResponse(item);

    expect(result.doi).toBe('10.1234/test');
    expect(result.title).toBe('Machine Learning in NLP');
    expect(result.authors).toHaveLength(2);
    expect(result.authors[0].lastName).toBe('Smith');
    expect(result.authors[0].initials).toBe('J. A.');
    expect(result.authors[1].lastName).toBe('Lee');
    expect(result.authors[1].initials).toBe('S.');
    expect(result.year).toBe('2024');
    expect(result.source).toBe('Journal of Computer Science');
    expect(result.volume).toBe('45');
    expect(result.issue).toBe('2');
    expect(result.pages).toBe('123-145');
    expect(result.type).toBe('journal-article');
  });

  it('handles missing fields gracefully', () => {
    const item = {
      DOI: '10.1234/minimal',
      title: ['Minimal Entry'],
      type: 'journal-article',
    };

    const result = parseCrossRefResponse(item);

    expect(result.doi).toBe('10.1234/minimal');
    expect(result.title).toBe('Minimal Entry');
    expect(result.authors).toHaveLength(0);
    expect(result.year).toBe('');
    expect(result.source).toBe('');
  });

  it('uses published-online when published-print is missing', () => {
    const item = {
      DOI: '10.1234/online',
      title: ['Online First'],
      'published-online': { 'date-parts': [[2023]] },
      type: 'journal-article',
    };

    const result = parseCrossRefResponse(item);
    expect(result.year).toBe('2023');
  });

  it('parses editors', () => {
    const item = {
      DOI: '10.1234/edited',
      title: ['Chapter Title'],
      editor: [{ family: 'Editor', given: 'First Middle' }],
      type: 'book-chapter',
    };

    const result = parseCrossRefResponse(item);
    expect(result.editors).toHaveLength(1);
    expect(result.editors![0].lastName).toBe('Editor');
    expect(result.editors![0].initials).toBe('F. M.');
  });
});

// ── API Function Tests ─────────────────────────────────────────────────

const mockJournalItem = {
  DOI: '10.1234/test',
  title: ['Machine Learning in NLP'],
  author: [{ family: 'Smith', given: 'John' }],
  'published-print': { 'date-parts': [[2024]] },
  'container-title': ['Journal of Computer Science'],
  volume: '45',
  issue: '2',
  page: '123-145',
  type: 'journal-article',
};

function mockFetchResponse(status: number, body?: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('searchByTitle', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed work on successful search', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [mockJournalItem] } }));

    const result = await searchByTitle('Machine Learning in NLP');

    expect(result).not.toBeNull();
    expect(result!.doi).toBe('10.1234/test');
    expect(result!.title).toBe('Machine Learning in NLP');
    expect(result!.authors[0].lastName).toBe('Smith');
  });

  it('returns null when no items found', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [] } }));

    const result = await searchByTitle('Nonexistent Paper');
    expect(result).toBeNull();
  });

  it('returns null when message.items is missing', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: {} }));

    const result = await searchByTitle('Some Paper');
    expect(result).toBeNull();
  });

  it('returns null on rate limit (429)', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(429));

    const result = await searchByTitle('Some paper');
    expect(result).toBeNull();
  });

  it('returns null on server error (500)', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(500));

    const result = await searchByTitle('Some paper');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network failure')));

    const result = await searchByTitle('Some paper');
    expect(result).toBeNull();
  });

  it('encodes title in URL', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [] } }));

    await searchByTitle('Title with spaces & special');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('Title%20with%20spaces'),
      expect.any(Object)
    );
  });

  it('includes mailto parameter for polite pool', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [] } }));

    await searchByTitle('Any title');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('mailto='),
      expect.any(Object)
    );
  });
});

describe('lookupByDOI', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed work on successful lookup', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: mockJournalItem }));

    const result = await lookupByDOI('10.1234/test');

    expect(result).not.toBeNull();
    expect(result!.doi).toBe('10.1234/test');
    expect(result!.title).toBe('Machine Learning in NLP');
  });

  it('strips https://doi.org/ prefix from DOI', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: mockJournalItem }));

    await lookupByDOI('https://doi.org/10.1234/test');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/works/10.1234%2Ftest'),
      expect.any(Object)
    );
  });

  it('returns null when message is missing', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, {}));

    const result = await lookupByDOI('10.1234/test');
    expect(result).toBeNull();
  });

  it('returns null on rate limit (429)', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(429));

    const result = await lookupByDOI('10.1234/test');
    expect(result).toBeNull();
  });

  it('returns null on not found (404)', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(404));

    const result = await lookupByDOI('10.1234/nonexistent');
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network failure')));

    const result = await lookupByDOI('10.1234/test');
    expect(result).toBeNull();
  });
});

describe('findDOI', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns DOI when title and author match', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [mockJournalItem] } }));

    const doi = await findDOI('Machine Learning in NLP', ['Smith']);

    expect(doi).toBe('10.1234/test');
  });

  it('returns null when title similarity is too low', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, {
      message: { items: [{
        ...mockJournalItem,
        title: ['Completely Different Title About Chemistry'],
      }] },
    }));

    const doi = await findDOI('Machine Learning in NLP', ['Smith']);
    expect(doi).toBeNull();
  });

  it('returns null when first author does not match', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [mockJournalItem] } }));

    const doi = await findDOI('Machine Learning in NLP', ['Johnson']);
    expect(doi).toBeNull();
  });

  it('returns DOI when no authors provided for verification', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [mockJournalItem] } }));

    const doi = await findDOI('Machine Learning in NLP', []);
    expect(doi).toBe('10.1234/test');
  });

  it('returns null when search returns no results', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [] } }));

    const doi = await findDOI('Nonexistent Paper', ['Author']);
    expect(doi).toBeNull();
  });

  it('returns null when search returns work without DOI', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, {
      message: { items: [{ ...mockJournalItem, DOI: '' }] },
    }));

    const doi = await findDOI('Machine Learning in NLP', ['Smith']);
    expect(doi).toBeNull();
  });

  it('supports partial author name matching', async () => {
    vi.stubGlobal('fetch', mockFetchResponse(200, { message: { items: [mockJournalItem] } }));

    // "Smith-Jones" should match "Smith"
    const doi = await findDOI('Machine Learning in NLP', ['Smith-Jones']);
    expect(doi).toBe('10.1234/test');
  });

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network failure')));

    const doi = await findDOI('Some Paper', ['Author']);
    expect(doi).toBeNull();
  });
});
