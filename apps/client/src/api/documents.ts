import type { DocumentParseResponse } from '../types';
import { apiRequest, type GetIdToken } from './client';

type AuthOptions = {
  getIdToken?: GetIdToken;
};

export type SavedDocumentPayload = {
  title: string;
  bodyHtml: string;
  citationStyle: string;
  citations?: unknown[];
  workspaceId?: string;
};

export async function parseUploadedDocument(
  file: File,
  options: AuthOptions = {},
): Promise<DocumentParseResponse> {
  const formData = new FormData();
  formData.append('document', file);

  let response: Response;

  try {
    response = await apiRequest('/api/documents/parse', {
      method: 'POST',
      body: formData,
      getIdToken: options.getIdToken,
      forceTokenRefresh: true,
    });
  } catch {
    throw new Error('Upload service is unreachable. Restart the backend and try the file again.');
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Upload failed with status ${response.status}`);
  }

  return response.json() as Promise<DocumentParseResponse>;
}

export async function saveDocumentState(
  payload: SavedDocumentPayload,
  options: AuthOptions = {},
) {
  const response = await apiRequest('/api/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    getIdToken: options.getIdToken,
  });

  if (!response.ok) {
    throw new Error(`Document save failed with status ${response.status}`);
  }

  return response.json();
}

export async function listDocuments(options: AuthOptions & { workspaceId?: string } = {}) {
  const query = options.workspaceId ? `?workspaceId=${encodeURIComponent(options.workspaceId)}` : '';
  const response = await apiRequest(`/api/documents${query}`, {
    getIdToken: options.getIdToken,
  });

  if (!response.ok) {
    throw new Error(`Document list failed with status ${response.status}`);
  }

  return response.json();
}
