import type { AcademicSource, AuthorName } from '../types.js';

type SemanticScholarPaper = {
  paperId: string;
  title: string;
  year?: number;
  venue?: string;
  url?: string;
  abstract?: string;
  authors?: Array<{ name: string }>;
  externalIds?: {
    DOI?: string;
  };
};

type CrossrefMessage = {
  items?: Array<{
    DOI?: string;
    URL?: string;
    title?: string[];
    issued?: { 'date-parts'?: number[][] };
    'container-title'?: string[];
    author?: Array<{ given?: string; family?: string; name?: string }>;
    abstract?: string;
  }>;
};

type PubMedSearchResponse = {
  esearchresult?: {
    idlist?: string[];
  };
};

type PubMedSummaryItem = {
  uid: string;
  title?: string;
  pubdate?: string;
  fulljournalname?: string;
  articleids?: Array<{ idtype?: string; value?: string }>;
  authors?: Array<{ name?: string }>;
};

type PubMedSummaryResponse = {
  result?: Record<string, PubMedSummaryItem | string[]>;
};

const PROVIDER_TIMEOUT_MS = Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS ?? 8000);

function stripHtmlTags(value?: string) {
  return (value ?? '').replace(/<[^>]+>/g, ' ');
}

function decodeHtmlEntities(value?: string) {
  return (value ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanText(value?: string) {
  return decodeHtmlEntities(stripHtmlTags(value)).replace(/\s+/g, ' ').trim();
}

function parseAuthorName(name?: string): AuthorName {
  if (!name) {
    return { literal: 'Unknown' };
  }

  if (name.includes(',')) {
    const [family, given] = name.split(',').map((part) => part.trim());
    return { family, given };
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return { literal: name };
  }

  return {
    given: parts.slice(0, -1).join(' '),
    family: parts[parts.length - 1],
  };
}

function inferYear(value?: string) {
  const match = value?.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'academic-writing-assistant/1.0',
      },
      signal: controller.signal,
    }).catch((error) => {
      if (controller.signal.aborted) {
        throw new Error(`Request timed out after ${PROVIDER_TIMEOUT_MS}ms`);
      }
      throw error;
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 academic-writing-assistant/1.0',
      },
      signal: controller.signal,
    }).catch((error) => {
      if (controller.signal.aborted) {
        throw new Error(`Request timed out after ${PROVIDER_TIMEOUT_MS}ms`);
      }
      throw error;
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.text();
}

export async function searchSemanticScholar(query: string, limit = 4): Promise<AcademicSource[]> {
  const url =
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}` +
    `&limit=${limit}&fields=title,year,venue,url,abstract,authors,externalIds`;

  const data = await fetchJson<{ data?: SemanticScholarPaper[] }>(url);

  return (data.data ?? []).map((paper) => ({
    id: paper.externalIds?.DOI ?? paper.paperId,
    provider: 'semantic-scholar',
    title: paper.title,
    authors: (paper.authors ?? []).map((author) => parseAuthorName(author.name)),
    year: paper.year,
    containerTitle: paper.venue,
    doi: paper.externalIds?.DOI,
    url: paper.url,
    abstract: paper.abstract,
    semanticScholarId: paper.paperId,
  }));
}

export async function searchCrossref(query: string, limit = 4): Promise<AcademicSource[]> {
  const url =
    `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}` +
    `&rows=${limit}&select=DOI,URL,title,issued,container-title,author,abstract`;

  const data = await fetchJson<{ message?: CrossrefMessage }>(url);

  return (data.message?.items ?? []).map((item) => ({
    id: item.DOI ?? item.URL ?? item.title?.[0] ?? crypto.randomUUID(),
    provider: 'crossref',
    title: item.title?.[0] ?? 'Untitled result',
    authors: (item.author ?? []).map((author) => ({
      given: author.given,
      family: author.family,
      literal: author.name,
    })),
    year: item.issued?.['date-parts']?.[0]?.[0],
    containerTitle: item['container-title']?.[0],
    doi: item.DOI,
    url: item.URL,
    abstract: item.abstract,
  }));
}

export async function searchPubMed(query: string, limit = 4): Promise<AcademicSource[]> {
  const searchUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json` +
    `&retmax=${limit}&sort=relevance&term=${encodeURIComponent(query)}`;

  const searchData = await fetchJson<PubMedSearchResponse>(searchUrl);
  const ids = searchData.esearchresult?.idlist ?? [];

  if (ids.length === 0) {
    return [];
  }

  const summaryUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`;
  const summaryData = await fetchJson<PubMedSummaryResponse>(summaryUrl);

  return ids
    .map((id) => summaryData.result?.[id] as PubMedSummaryItem | undefined)
    .filter((item): item is PubMedSummaryItem => Boolean(item))
    .map((item) => {
      const doi = item.articleids?.find((articleId) => articleId.idtype === 'doi')?.value;

      return {
        id: doi ?? item.uid,
        provider: 'pubmed',
        title: item.title ?? 'Untitled result',
        authors: (item.authors ?? []).map((author) => parseAuthorName(author.name)),
        year: inferYear(item.pubdate),
        containerTitle: item.fulljournalname,
        doi,
        url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
        pubmedId: item.uid,
      };
    });
}

type OpenAlexWork = {
  id: string;
  title?: string;
  authorships?: Array<{
    author: { display_name: string };
  }>;
  publication_year?: number;
  primary_location?: {
    source?: { display_name?: string };
  };
  doi?: string;
  primary_location_display_name?: string;
  abstract_inverted_index?: Record<string, number[]>;
};

export async function searchOpenAlex(query: string, limit = 4): Promise<AcademicSource[]> {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}` +
    `&per_page=${limit}&sort=relevance`;

  const data = await fetchJson<{ results?: OpenAlexWork[] }>(url);

  return (data.results ?? []).map((work) => ({
    id: work.doi ?? work.id,
    provider: 'openalex' as const,
    title: work.title ?? 'Untitled result',
    authors: (work.authorships ?? []).map((a) => parseAuthorName(a.author.display_name)),
    year: work.publication_year,
    containerTitle: work.primary_location?.source?.display_name,
    doi: work.doi,
    url: work.doi ? `https://doi.org/${work.doi}` : work.id,
    abstract: work.abstract_inverted_index
      ? Object.entries(work.abstract_inverted_index)
          .sort(([, a], [, b]) => a[0] - b[0])
          .map(([word]) => word)
          .join(' ')
      : undefined,
  }));
}

export async function searchAcademicSources(query: string): Promise<AcademicSource[]> {
  const providers: Array<{
    name: string;
    execute: () => Promise<AcademicSource[]>;
  }> = [
    { name: 'Semantic Scholar', execute: () => searchSemanticScholar(query) },
    { name: 'Crossref', execute: () => searchCrossref(query) },
    { name: 'PubMed', execute: () => searchPubMed(query) },
    { name: 'OpenAlex', execute: () => searchOpenAlex(query) },
  ];
  const settled = await Promise.all(
    providers.map(async (provider) => {
      try {
        return await provider.execute();
      } catch (error) {
        console.error(`Academic search provider failed (${provider.name})`, error);
        return [];
      }
    }),
  );

  const combined = settled.flat();
  const seen = new Set<string>();

  return combined
    .filter((source) => {
      const key =
        source.doi?.toLowerCase() ??
        source.pubmedId ??
        source.semanticScholarId ??
        source.title.toLowerCase().replace(/\W+/g, '-');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((left, right) => (right.year ?? 0) - (left.year ?? 0))
    .slice(0, 8);
}
