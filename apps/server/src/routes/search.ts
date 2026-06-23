import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireSearchEntitlement } from '../middleware/searchEntitlement.js';
import { searchAcademicSources } from '../services/searchProviders.js';

export const searchRouter = Router();

searchRouter.get('/', requireAuth, requireSearchEntitlement, async (request, response) => {
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
