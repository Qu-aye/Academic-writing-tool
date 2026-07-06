import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireSearchEntitlement } from '../middleware/searchEntitlement.js';
import { UserModel } from '../models/User.js';
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
