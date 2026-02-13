'use client';

import CitationInput from '@/components/CitationInput';
import ValidationResults from '@/components/ValidationResults';
import { useCitationValidator } from '@/hooks/useCitationValidator';

export default function Home() {
  const { results, isLoading, error, validate, clear } = useCitationValidator();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          APA Citation Checker
        </h1>
        <p className="text-gray-600">
          Google Scholar에서 복사한 참고문헌을 APA 7th Edition 규칙에 맞게 검증하고 자동 수정합니다.
        </p>
      </div>

      <div className="space-y-6">
        <CitationInput onValidate={validate} isLoading={isLoading} />
        <ValidationResults results={results} error={error} />
      </div>

      <footer className="mt-12 text-center text-xs text-gray-400">
        <p>APA 7th Edition 규칙 기반 | CrossRef API 활용 DOI 자동 검색</p>
      </footer>
    </main>
  );
}
