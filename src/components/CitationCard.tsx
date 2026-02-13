'use client';

import { useState } from 'react';
import type { ValidationResult } from '@/lib/types';

interface CitationCardProps {
  result: ValidationResult;
  index: number;
}

export default function CitationCard({ result, index }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const { citation, errors, autoFixes, manualFixes, fixedCitation, score } = result;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fixedCitation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = fixedCitation;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  };

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getScoreColor(score)}`}>
            {score}점
          </div>
          {errorCount > 0 && (
            <span className="text-sm text-red-600">{errorCount}개 오류</span>
          )}
          {warningCount > 0 && (
            <span className="text-sm text-yellow-600">{warningCount}개 경고</span>
          )}
          {autoFixes.length > 0 && (
            <span className="text-sm text-green-600">{autoFixes.length}개 자동수정</span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Original */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">원본</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg font-mono leading-relaxed">
              {citation.raw}
            </p>
          </div>

          {/* Fixed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">수정본</h4>
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
              >
                {copied ? '✓ 복사됨' : '복사'}
              </button>
            </div>
            <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded-lg font-mono leading-relaxed">
              {fixedCitation}
            </p>
          </div>

          {/* Auto Fixes */}
          {autoFixes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
                자동 수정 ({autoFixes.length})
              </h4>
              <ul className="space-y-1.5">
                {autoFixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <div>
                      <span className="text-gray-700">{fix.description}</span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        <span className="line-through text-red-400">{fix.original}</span>
                        {' → '}
                        <span className="text-green-600">{fix.fixed}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Manual Fixes */}
          {manualFixes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-yellow-600 uppercase tracking-wider mb-2">
                수동 확인 필요 ({manualFixes.length})
              </h4>
              <ul className="space-y-1.5">
                {manualFixes.map((fix, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-500 mt-0.5">⚠</span>
                    <div>
                      <span className="text-gray-700">{fix.message}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{fix.hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* All Errors Detail (collapsible) */}
          {errors.length > 0 && (
            <details className="text-sm">
              <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                전체 검증 결과 상세 ({errors.length})
              </summary>
              <ul className="mt-2 space-y-1.5">
                {errors.map((error, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5">{getSeverityIcon(error.severity)}</span>
                    <div>
                      <span className="text-gray-700">{error.message}</span>
                      <span className="text-xs text-gray-400 ml-2">[{error.rule}]</span>
                      {error.autoFixable && (
                        <span className="text-xs text-green-500 ml-1">(자동수정됨)</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Perfect score */}
          {errors.length === 0 && (
            <div className="text-center py-2 text-green-600 text-sm font-medium">
              ✓ APA 7th Edition 규칙에 완벽히 부합합니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
