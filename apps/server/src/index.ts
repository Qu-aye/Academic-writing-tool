import cors from 'cors';
import express from 'express';
import { documentsRouter } from './routes/documents.js';
import { searchRouter } from './routes/search.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  }),
);

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.use('/api/documents', documentsRouter);
app.use('/api/search', searchRouter);

app.listen(port, () => {
  console.log(`Academic search API listening on port ${port}`);
});
