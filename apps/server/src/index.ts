import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase } from './db/mongoose.js';
import { requireAuth } from './middleware/auth.js';
import { contactRouter } from './routes/contact.js';
import { documentsRouter } from './routes/documents.js';
import { searchRouter } from './routes/search.js';
import { stripeWebhooksRouter } from './routes/stripeWebhooks.js';
import { workspacesRouter } from './routes/workspaces.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

await connectDatabase();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  }),
);

app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhooksRouter);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.use('/api/contact', contactRouter);
app.use('/api/documents', requireAuth, documentsRouter);
app.use('/api/workspaces', requireAuth, workspacesRouter);
app.use('/api/search', searchRouter);

app.listen(port, () => {
  console.log(`SewornaAI API listening on http://localhost:${port}`);
});
