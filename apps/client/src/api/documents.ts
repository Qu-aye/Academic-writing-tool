import type { DocumentParseResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

export async function parseUploadedDocument(file: File): Promise<DocumentParseResponse> {
  const formData = new FormData();
  formData.append('document', file);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/documents/parse`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error(
      `Upload service is unreachable at ${API_BASE_URL}. Restart the backend and try the file again.`,
    );
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error ?? `Upload failed with status ${response.status}`);
  }

  return response.json() as Promise<DocumentParseResponse>;
}
