import type { SearchResponse } from '../types';
import { apiRequest } from './client';

export async function searchAcademicSources(
  query: string,
  signal?: AbortSignal,
  getIdToken?: () => Promise<string | null>,
): Promise<SearchResponse> {
  const encoded = encodeURIComponent(query.trim());
  const response = await apiRequest(`/api/search?q=${encoded}`, { signal, getIdToken });

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  return response.json() as Promise<SearchResponse>;
}
