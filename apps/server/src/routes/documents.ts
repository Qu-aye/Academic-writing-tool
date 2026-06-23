import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getAuth } from '../middleware/auth.js';
import { DocumentModel } from '../models/Document.js';
import { WorkspaceModel, type WorkspaceRole } from '../models/Workspace.js';
import { parseUploadedDocument } from '../services/documentParsing.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

export const documentsRouter = Router();

const documentStateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1),
  citationStyle: z.string().trim().min(1).default('harvard-ctr'),
  citations: z.array(z.unknown()).default([]),
  workspaceId: z.string().trim().min(1).optional(),
});

function canWrite(role: WorkspaceRole) {
  return role === 'owner' || role === 'editor';
}

async function getWorkspaceRole(workspaceId: string, userId: string) {
  const workspace = await WorkspaceModel.findOne({
    workspaceId,
    'members.userId': userId,
  });
  const member = workspace?.members.find((entry) => entry.userId === userId);

  return member?.role as WorkspaceRole | undefined;
}

async function getAccessibleWorkspaceIds(userId: string) {
  const workspaces = await WorkspaceModel.find({ 'members.userId': userId }).select('workspaceId');
  return workspaces.map((workspace) => workspace.workspaceId);
}

documentsRouter.post('/parse', upload.single('document'), async (request, response) => {
  const file = request.file;

  if (!file) {
    response.status(400).json({
      error: 'Please upload a document file.',
    });
    return;
  }

  try {
    const parsed = await parseUploadedDocument({
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
    });

    response.json({
      fileName: file.originalname,
      fileType: parsed.format,
      html: parsed.html,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to parse the uploaded document.';

    response.status(400).json({
      error: message,
    });
  }
});

documentsRouter.post('/', async (request, response) => {
  const auth = getAuth(request);
  const parsed = documentStateSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'Please provide a valid document payload.' });
    return;
  }

  if (parsed.data.workspaceId) {
    const role = await getWorkspaceRole(parsed.data.workspaceId, auth.uid);

    if (!role || !canWrite(role)) {
      response.status(403).json({ error: 'You cannot save documents in this workspace.' });
      return;
    }
  }

  const document = await DocumentModel.create({
    ownerId: auth.uid,
    workspaceId: parsed.data.workspaceId,
    title: parsed.data.title,
    bodyHtml: parsed.data.bodyHtml,
    citationStyle: parsed.data.citationStyle,
    citations: parsed.data.citations,
  });

  response.status(201).json({ document });
});

documentsRouter.get('/', async (request, response) => {
  const auth = getAuth(request);
  const workspaceId = typeof request.query.workspaceId === 'string' ? request.query.workspaceId : undefined;
  const accessibleWorkspaceIds = await getAccessibleWorkspaceIds(auth.uid);

  if (workspaceId && !accessibleWorkspaceIds.includes(workspaceId)) {
    response.status(403).json({ error: 'You do not belong to this workspace.' });
    return;
  }

  const documents = await DocumentModel.find(
    workspaceId
      ? { workspaceId }
      : {
          $or: [
            { ownerId: auth.uid, workspaceId: { $exists: false } },
            { workspaceId: { $in: accessibleWorkspaceIds } },
          ],
        },
  ).sort({ updatedAt: -1 });

  response.json({ documents });
});

documentsRouter.get('/:documentId', async (request, response) => {
  const auth = getAuth(request);
  const document = await DocumentModel.findById(request.params.documentId);

  if (!document) {
    response.status(404).json({ error: 'Document not found.' });
    return;
  }

  const hasAccess =
    document.ownerId === auth.uid ||
    (document.workspaceId && (await getWorkspaceRole(document.workspaceId, auth.uid)));

  if (!hasAccess) {
    response.status(403).json({ error: 'You cannot access this document.' });
    return;
  }

  response.json({ document });
});

documentsRouter.patch('/:documentId', async (request, response) => {
  const auth = getAuth(request);
  const parsed = documentStateSchema.partial().safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: 'Please provide a valid document update.' });
    return;
  }

  const document = await DocumentModel.findById(request.params.documentId);

  if (!document) {
    response.status(404).json({ error: 'Document not found.' });
    return;
  }

  const role = document.workspaceId ? await getWorkspaceRole(document.workspaceId, auth.uid) : undefined;
  const canEdit = document.ownerId === auth.uid || (role && canWrite(role));

  if (!canEdit) {
    response.status(403).json({ error: 'You cannot edit this document.' });
    return;
  }

  document.set(parsed.data);
  await document.save();

  response.json({ document });
});

documentsRouter.delete('/:documentId', async (request, response) => {
  const auth = getAuth(request);
  const document = await DocumentModel.findById(request.params.documentId);

  if (!document) {
    response.status(404).json({ error: 'Document not found.' });
    return;
  }

  const role = document.workspaceId ? await getWorkspaceRole(document.workspaceId, auth.uid) : undefined;
  const canDelete = document.ownerId === auth.uid || role === 'owner';

  if (!canDelete) {
    response.status(403).json({ error: 'You cannot delete this document.' });
    return;
  }

  await document.deleteOne();
  response.status(204).end();
});
