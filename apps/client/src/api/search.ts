import type { CitationResponse, SearchResponse } from '../types';
import { apiRequest } from './client';

export class SearchApiError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = 'SearchApiError';
    this.status = status;
    this.details = details;
  }
}

export async function searchAcademicSources(
  query: string,
  signal?: AbortSignal,
  getIdToken?: () => Promise<string | null>,
): Promise<SearchResponse> {
  const encoded = encodeURIComponent(query.trim());
  const response = await apiRequest(`/api/search?q=${encoded}`, { signal, getIdToken });

  if (!response.ok) {
    let details: string | undefined;

    try {
      const body = (await response.json()) as { error?: string };
      details = body.error;
    } catch {
      details = undefined;
    }

    throw new SearchApiError(
      response.status,
      details ?? `Search failed with status ${response.status}`,
      details,
    );
  }

  return response.json() as Promise<SearchResponse>;
}

export class CitationApiError extends Error {
  status: number;
  details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = 'CitationApiError';
    this.status = status;
    this.details = details;
  }
}

export async function generateCitation(
  query: string,
  style: string,
  yearFilter: string,
  signal?: AbortSignal,
  getIdToken?: () => Promise<string | null>,
): Promise<CitationResponse> {
  const response = await apiRequest('/api/search/citation', {
    method: 'POST',
    signal,
    getIdToken,
    body: JSON.stringify({ query: query.trim(), style, yearFilter }),
  });
  if (!response.ok) {
    let details: string | undefined;
    try {
      const body = (await response.json()) as { error?: string };
      details = body.error;
    } catch {
      details = undefined;
    }
    throw new CitationApiError(
      response.status,
      details ?? `Citation generation failed with status ${response.status}`,
      details,
    );
  }
  return response.json() as Promise<CitationResponse>;
}
