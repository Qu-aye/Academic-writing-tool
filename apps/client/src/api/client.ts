const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

type ApiRequestOptions = RequestInit & {
  getIdToken?: () => Promise<string | null>;
};

export async function apiRequest(path: string, options: ApiRequestOptions = {}) {
  const { getIdToken, headers, ...requestOptions } = options;
  const token = await getIdToken?.();
  const nextHeaders = new Headers(headers);

  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: nextHeaders,
  });
}
