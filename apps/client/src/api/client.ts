function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function inferApiBaseUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const { protocol, hostname, origin } = window.location;
  const renderFrontendHostPattern = /^([a-z0-9-]+)-frontend\.onrender\.com$/i;
  const renderMatch = hostname.match(renderFrontendHostPattern);

  if (renderMatch) {
    const servicePrefix = renderMatch[1];
    return `${protocol}//${servicePrefix}-server.onrender.com`;
  }

  return origin;
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = configuredApiBaseUrl
  ? normalizeBaseUrl(configuredApiBaseUrl)
  : import.meta.env.DEV
    ? 'http://localhost:4000'
    : inferApiBaseUrl();

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
