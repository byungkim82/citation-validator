import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mock the validator module
vi.mock('@/lib/validator', () => ({
  validateCitations: vi.fn(),
}));

import { validateCitations } from '@/lib/validator';

const mockValidateCitations = vi.mocked(validateCitations);

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const mockResult = {
  id: 'test-id',
  citation: { raw: 'test', authors: [], year: '2024', title: 'Test', source: '', type: 'journal' },
  errors: [],
  autoFixes: [],
  manualFixes: [],
  fixedCitation: 'test fixed',
  score: 100,
};

describe('POST /api/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Success cases ──────────────────────────────────────────────────

  it('returns validation results for valid input', async () => {
    mockValidateCitations.mockResolvedValueOnce([mockResult] as any);

    const response = await POST(makeRequest({ text: 'Kim, B. Y. (2024). Test. Journal, 1(1), 1-10.' }) as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].id).toBe('test-id');
  });

  it('passes useCrossRef=true by default', async () => {
    mockValidateCitations.mockResolvedValueOnce([mockResult] as any);

    await POST(makeRequest({ text: 'Some citation text' }) as any);

    expect(mockValidateCitations).toHaveBeenCalledWith('Some citation text', true);
  });

  it('passes useCrossRef=false when specified', async () => {
    mockValidateCitations.mockResolvedValueOnce([mockResult] as any);

    await POST(makeRequest({ text: 'Some citation text', useCrossRef: false }) as any);

    expect(mockValidateCitations).toHaveBeenCalledWith('Some citation text', false);
  });

  it('trims whitespace from input text', async () => {
    mockValidateCitations.mockResolvedValueOnce([mockResult] as any);

    await POST(makeRequest({ text: '  Some citation text  ' }) as any);

    expect(mockValidateCitations).toHaveBeenCalledWith('Some citation text', true);
  });

  // ── Input validation ───────────────────────────────────────────────

  it('returns 400 when text is missing', async () => {
    const response = await POST(makeRequest({}) as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Citation text is required');
  });

  it('returns 400 when text is empty string', async () => {
    const response = await POST(makeRequest({ text: '' }) as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Citation text is required');
  });

  it('returns 400 when text is whitespace only', async () => {
    const response = await POST(makeRequest({ text: '   ' }) as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Citation text is required');
  });

  it('returns 400 when text is not a string', async () => {
    const response = await POST(makeRequest({ text: 123 }) as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Citation text is required');
  });

  // ── Error handling ─────────────────────────────────────────────────

  it('returns 500 when validateCitations throws', async () => {
    mockValidateCitations.mockRejectedValueOnce(new Error('Unexpected error'));

    const response = await POST(makeRequest({ text: 'Some citation' }) as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error during validation');
  });
});
