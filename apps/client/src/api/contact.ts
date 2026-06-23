import { apiRequest } from './client';

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

export async function sendContactMessage(payload: ContactPayload) {
  const response = await apiRequest('/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Contact request failed with status ${response.status}`);
  }
}
