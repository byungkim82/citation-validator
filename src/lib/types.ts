export interface Author {
  lastName: string;
  initials: string; // e.g., "F. M."
}

export interface ParsedCitation {
  raw: string;
  authors: Author[];
  year: string;
  title: string;
  source: string; // journal name or publisher
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  editors?: Author[];
  edition?: string;
  type: 'journal' | 'book' | 'chapter' | 'web' | 'unknown';
}

export interface ValidationError {
  rule: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  original: string;
  suggested?: string;
  autoFixable: boolean;
}

export interface AutoFix {
  rule: string;
  field: string;
  original: string;
  fixed: string;
  description: string;
}

export interface ManualFix {
  rule: string;
  field: string;
  message: string;
  hint: string;
}

export interface ValidationResult {
  id: string;
  citation: ParsedCitation;
  errors: ValidationError[];
  autoFixes: AutoFix[];
  manualFixes: ManualFix[];
  fixedCitation: string;
  score: number; // 0-100 compliance score
}

export interface CrossRefWork {
  doi: string;
  title: string;
  authors: Author[];
  year: string;
  source: string;
  volume?: string;
  issue?: string;
  pages?: string;
  type: string;
  publisher?: string;
  editors?: Author[];
  edition?: string;
}
