'use client';

import { useState } from 'react';
import type { ValidationResult } from '@/lib/types';
import CitationCard from './CitationCard';

interface ValidationResultsProps {
  results: ValidationResult[];
  error: string | null;
}

export default function ValidationResults({ results, error }: ValidationResultsProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        <p className="font-semibold">오류가 발생했습니다</p>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (results.length === 0) return null;

  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
  const totalAutoFixes = results.reduce((sum, r) => sum + r.autoFixes.length, 0);
  const totalManualFixes = results.reduce((sum, r) => sum + r.manualFixes.length, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">검증 결과</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">전체 평균:</span>
              <span className={`font-bold ${avgScore >= 80 ? 'text-green-600' : avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {avgScore}점
              </span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">{results.length}개 참고문헌</span>
            {totalAutoFixes > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-green-600">{totalAutoFixes}개 자동수정</span>
              </>
            )}
            {totalManualFixes > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-yellow-600">{totalManualFixes}개 수동확인</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Individual results */}
      {results.map((result, index) => (
        <CitationCard key={result.id} result={result} index={index} />
      ))}

      {/* Copy all button */}
      {results.length > 1 && (
        <CopyAllButton results={results} />
      )}
    </div>
  );
}

function CopyAllButton({ results }: { results: ValidationResult[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const allFixed = results.map(r => r.fixedCitation).join('\n\n');
    try {
      await navigator.clipboard.writeText(allFixed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = allFixed;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex justify-center">
      <button
        onClick={handleCopyAll}
        className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
      >
        {copied ? '✓ 전체 복사됨' : '수정된 참고문헌 전체 복사'}
      </button>
    </div>
  );
}
