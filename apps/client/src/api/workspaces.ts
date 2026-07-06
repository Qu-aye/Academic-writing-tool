import type { Workspace, WorkspaceRole } from '../types';
import { apiRequest, type GetIdToken } from './client';

type AuthOptions = {
  getIdToken?: GetIdToken;
};

export async function listWorkspaces(options: AuthOptions = {}) {
  const response = await apiRequest('/api/workspaces', {
    getIdToken: options.getIdToken,
  });

  if (!response.ok) {
    throw new Error(`Workspace list failed with status ${response.status}`);
  }

  return response.json() as Promise<{ workspaces: Workspace[] }>;
}

export async function createWorkspace(name: string, options: AuthOptions = {}) {
  const response = await apiRequest('/api/workspaces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
    getIdToken: options.getIdToken,
  });

  if (!response.ok) {
    throw new Error(`Workspace create failed with status ${response.status}`);
  }

  return response.json() as Promise<{ workspace: Workspace }>;
}

export async function upsertWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
  options: AuthOptions = {},
) {
  const response = await apiRequest(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
      getIdToken: options.getIdToken,
    },
  );

  if (!response.ok) {
    throw new Error(`Workspace member update failed with status ${response.status}`);
  }

  return response.json() as Promise<{ workspace: Workspace }>;
}
