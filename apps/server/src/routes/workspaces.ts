import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { getAuth } from '../middleware/auth.js';
import { WorkspaceModel } from '../models/Workspace.js';

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const memberSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(['owner', 'editor', 'viewer']),
});

export const workspacesRouter = Router();

workspacesRouter.post('/', async (request, response) => {
  const auth = getAuth(request);
  const parsed = createWorkspaceSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'Please provide a valid workspace name.' });
    return;
  }

  const workspace = await WorkspaceModel.create({
    workspaceId: randomUUID(),
    name: parsed.data.name,
    ownerId: auth.uid,
    members: [{ userId: auth.uid, role: 'owner' }],
  });

  response.status(201).json({ workspace });
});

workspacesRouter.get('/', async (request, response) => {
  const auth = getAuth(request);
  const workspaces = await WorkspaceModel.find({ 'members.userId': auth.uid }).sort({
    updatedAt: -1,
  });

  response.json({ workspaces });
});

workspacesRouter.put('/:workspaceId/members/:userId', async (request, response) => {
  const auth = getAuth(request);
  const parsed = memberSchema.safeParse({
    userId: request.params.userId,
    role: request.body.role,
  });

  if (!parsed.success) {
    response.status(400).json({ error: 'Please provide a valid member role.' });
    return;
  }

  const workspace = await WorkspaceModel.findOne({
    workspaceId: request.params.workspaceId,
    ownerId: auth.uid,
  });

  if (!workspace) {
    response.status(404).json({ error: 'Workspace not found.' });
    return;
  }

  const existingMember = workspace.members.find((member) => member.userId === parsed.data.userId);

  if (existingMember) {
    existingMember.role = parsed.data.role;
  } else {
    workspace.members.push(parsed.data);
  }

  await workspace.save();
  response.json({ workspace });
});

workspacesRouter.delete('/:workspaceId/members/:userId', async (request, response) => {
  const auth = getAuth(request);
  const workspace = await WorkspaceModel.findOne({
    workspaceId: request.params.workspaceId,
    ownerId: auth.uid,
  });

  if (!workspace) {
    response.status(404).json({ error: 'Workspace not found.' });
    return;
  }

  if (workspace.ownerId === request.params.userId) {
    response.status(400).json({ error: 'Workspace owners cannot remove themselves.' });
    return;
  }

  const memberIndex = workspace.members.findIndex((member) => member.userId === request.params.userId);

  if (memberIndex >= 0) {
    workspace.members.splice(memberIndex, 1);
  }

  await workspace.save();

  response.status(204).end();
});
