import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireSearchEntitlement } from '../middleware/searchEntitlement.js';
import { UserModel } from '../models/User.js';
import { searchAcademicSources } from '../services/searchProviders.js';

export const searchRouter = Router();

const SEARCH_REQUESTS_PER_MINUTE = Number(process.env.SEARCH_REQUESTS_PER_MINUTE ?? 30);
const searchRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: SEARCH_REQUESTS_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many search requests. Please wait before trying again.',
  },
});

searchRouter.get('/', searchRateLimiter, requireAuth, requireSearchEntitlement, async (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : '';

  if (query.length < 5) {
    response.status(400).json({
      error: 'Query must be at least 5 characters long.',
    });
    return;
  }

  try {
    const results = await searchAcademicSources(query);

    const lookupFirebaseUid = response.locals.searchLookupFirebaseUid as string | undefined;
    if (lookupFirebaseUid) {
      try {
        await UserModel.updateOne(
          { firebaseUid: lookupFirebaseUid },
          {
            $inc: { searchLookupsUsed: 1 },
          },
        );
      } catch (error) {
        console.error('Failed to record search lookup usage', error);
      }
    }

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
