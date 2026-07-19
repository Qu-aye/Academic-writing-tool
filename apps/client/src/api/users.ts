import { apiRequest } from './client';

export type UserProfile = {
  email: string;
  displayName: string;
  subscriptionTier: 'free' | 'premium' | 'team';
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | 'none';
  searchCount: number;
  searchCountResetAt: string | null;
};

export async function getCurrentUser(options: { getIdToken?: () => Promise<string | null> } = {}) {
  const response = await apiRequest('/api/users/me', {
    getIdToken: options.getIdToken,
  });
  if (!response.ok) {
    throw new Error(`Failed to load user profile with status ${response.status}`);
  }
  const data = (await response.json()) as { user: UserProfile };
  return data.user;
}
