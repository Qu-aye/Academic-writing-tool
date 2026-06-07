export type CitationStyle = 'harvard-ctr' | 'apa' | 'mla' | 'vancouver';
export type ExportFormat = 'pdf' | 'docx' | 'doc' | 'rtf' | 'html' | 'txt' | 'md';

export type AuthorName = {
  given?: string;
  family?: string;
  literal?: string;
};

export type AcademicSource = {
  id: string;
  provider: 'semantic-scholar' | 'crossref' | 'pubmed' | 'google-scholar';
  title: string;
  authors: AuthorName[];
  year?: number;
  containerTitle?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  pubmedId?: string;
  semanticScholarId?: string;
};

export type SearchResponse = {
  query: string;
  results: AcademicSource[];
};

export type DocumentParseResponse = {
  fileName: string;
  fileType: string;
  html: string;
};

export type CitationEntry = {
  id: string;
  source: AcademicSource;
  insertedAt: number;
};
