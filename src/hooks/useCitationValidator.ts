'use client';

import { useState, useCallback } from 'react';
import type { ValidationResult } from '@/lib/types';

interface UseCitationValidatorReturn {
  results: ValidationResult[];
  isLoading: boolean;
  error: string | null;
  validate: (text: string, useCrossRef?: boolean) => Promise<void>;
  clear: () => void;
}

export function useCitationValidator(): UseCitationValidatorReturn {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (text: string, useCrossRef: boolean = true) => {
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, useCrossRef }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Validation failed');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, isLoading, error, validate, clear };
}
