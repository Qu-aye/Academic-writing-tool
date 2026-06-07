import type { SearchResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

export async function searchAcademicSources(query: string, signal?: AbortSignal): Promise<SearchResponse> {
  const encoded = encodeURIComponent(query.trim());
  const response = await fetch(`${API_BASE_URL}/api/search?q=${encoded}`, { signal });

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  return response.json() as Promise<SearchResponse>;
}
