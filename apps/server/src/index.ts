import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase } from './db/mongoose.js';
import { requireAuth } from './middleware/auth.js';
import { contactRouter } from './routes/contact.js';
import { documentsRouter } from './routes/documents.js';
import { searchRouter } from './routes/search.js';
import { paystackWebhooksRouter } from './routes/paystackWebhooks.js';
import { workspacesRouter } from './routes/workspaces.js';
import { usersRouter } from './routes/users.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.set('trust proxy', 1);

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

const configuredClientOrigins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map(normalizeOrigin);
const allowAllOrigins = configuredClientOrigins.length === 0;

await connectDatabase();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowAllOrigins) {
        callback(null, true);
        return;
      }

      if (configuredClientOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed'));
    },
  }),
);

app.use('/api/webhooks/paystack', paystackWebhooksRouter);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.use('/api/contact', contactRouter);
app.use('/api/documents', requireAuth, documentsRouter);
app.use('/api/workspaces', requireAuth, workspacesRouter);
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/search', searchRouter);

app.listen(port, () => {
  console.log(`SewornaAI API listening on http://localhost:${port}`);
});
