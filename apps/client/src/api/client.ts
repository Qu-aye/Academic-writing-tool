const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

export type GetIdToken = (forceRefresh?: boolean) => Promise<string | null>;

type ApiRequestOptions = RequestInit & {
  getIdToken?: GetIdToken;
  forceTokenRefresh?: boolean;
};

export async function apiRequest(path: string, options: ApiRequestOptions = {}) {
  const { getIdToken, forceTokenRefresh = false, headers, ...requestOptions } = options;
  const baseHeaders = new Headers(headers);

  const sendRequest = async (shouldForceTokenRefresh: boolean) => {
    const requestHeaders = new Headers(baseHeaders);
    const token = await getIdToken?.(shouldForceTokenRefresh);

    if (token) {
      requestHeaders.set('Authorization', 'Bearer ' + token);
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: requestHeaders,
    });
  };

  const response = await sendRequest(forceTokenRefresh);
  if (response.status !== 401 || !getIdToken) {
    return response;
  }

  return sendRequest(true);
}
