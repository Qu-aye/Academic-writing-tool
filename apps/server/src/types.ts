export type AuthorName = {
  given?: string;
  family?: string;
  literal?: string;
};

export type AcademicSource = {
  id: string;
  provider: 'semantic-scholar' | 'crossref' | 'pubmed' | 'openalex';
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
export type CitationStyle = 'harvard-ctr' | 'apa' | 'mla' | 'vancouver';
export type CitationFilterBucket = { label: string; minYear: number; maxYear: number };
export type CitationResponse = {
  bibliographyString: string;
  filterBuckets: CitationFilterBucket[];
  sourceCount: number;
};
