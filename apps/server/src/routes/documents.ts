import { Router } from 'express';
import multer from 'multer';
import { parseUploadedDocument } from '../services/documentParsing.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

export const documentsRouter = Router();

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
