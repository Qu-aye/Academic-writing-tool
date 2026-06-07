import { Router } from 'express';
import { searchAcademicSources } from '../services/searchProviders.js';

export const searchRouter = Router();

searchRouter.get('/', async (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';

  if (query.length < 5) {
    response.status(400).json({
      error: 'Query must be at least 5 characters long.',
    });
    return;
  }

  try {
    const results = await searchAcademicSources(query);
    response.json({
      query,
      results,
    });
  } catch (error) {
    console.error('Academic search failed', error);
    response.status(500).json({
      error: 'Unable to search academic sources right now.',
    });
  }
});
