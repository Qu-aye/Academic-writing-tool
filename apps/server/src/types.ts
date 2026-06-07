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
