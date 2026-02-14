export interface Author {
  lastName: string;
  initials: string; // e.g., "F. M."
  isGroupAuthor?: boolean; // true for organizational/group authors
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
  type: 'journal' | 'book' | 'chapter' | 'web' | 'report' | 'conference' | 'dissertation' | 'unknown';
  fullDate?: string; // e.g., "2024, March 15" (newspapers/blogs/conferences)
  yearSuffix?: string; // e.g., "a", "b" (same author, same year disambiguation)
  reportNumber?: string; // e.g., "Report No. 2024-01"
  bracketType?: string; // e.g., "[Paper presentation]", "[Doctoral dissertation, MIT]"
  conferenceName?: string; // conference name + location
  institution?: string; // degree-granting institution for dissertations
  databaseName?: string; // e.g., "ProQuest Dissertations"
  isGroupAuthor?: boolean; // true when all authors are organizational
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
  reportNumber?: string;
  conferenceName?: string;
  institution?: string;
}
