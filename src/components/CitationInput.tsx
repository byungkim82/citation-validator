'use client';

import { useState } from 'react';

interface CitationInputProps {
  onValidate: (text: string, useCrossRef: boolean) => void;
  isLoading: boolean;
}

const EXAMPLE_CITATION = `Kim, B. Y., & Lee, S. H. (2024). The Impact of Artificial Intelligence on Higher Education: A Systematic Review. Journal of Educational Technology, 45(2), 123-145.

Smith, J. A., Johnson, M. B., & Williams, R. T. (2023). Machine learning approaches in natural language processing. Computational Linguistics, Vol. 28(3), pp. 45-67. doi:10.1234/cl.2023.001`;

export default function CitationInput({ onValidate, isLoading }: CitationInputProps) {
  const [text, setText] = useState('');
  const [useCrossRef, setUseCrossRef] = useState(true);

  const handleSubmit = () => {
    if (text.trim()) {
      onValidate(text.trim(), useCrossRef);
    }
  };

  const handleExample = () => {
    setText(EXAMPLE_CITATION);
  };

  const citationCount = text.trim() ? text.trim().split(/\n\s*\n/).filter(s => s.trim()).length : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">참고문헌 입력</h2>
        <button
          onClick={handleExample}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          예시 입력
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Google Scholar에서 복사한 APA 참고문헌을 여기에 붙여넣으세요.&#10;&#10;여러 개의 참고문헌은 빈 줄로 구분합니다."
        className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono leading-relaxed placeholder:text-gray-400"
      />

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={useCrossRef}
              onChange={(e) => setUseCrossRef(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            CrossRef에서 DOI 자동 검색
          </label>
          {citationCount > 0 && (
            <span className="text-sm text-gray-500">
              {citationCount}개 참고문헌 감지
            </span>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              검증 중...
            </>
          ) : '검증하기'}
        </button>
      </div>
    </div>
  );
}
