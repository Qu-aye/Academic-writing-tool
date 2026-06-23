import type { NextFunction, Request, Response } from 'express';
import { getAuth } from './auth.js';
import { ensureUser } from '../services/users.js';

const DEFAULT_FREE_LOOKUPS_PER_MONTH = 25;

function isNewLookupPeriod(periodStart: Date) {
  const now = new Date();
  return (
    now.getUTCFullYear() !== periodStart.getUTCFullYear() ||
    now.getUTCMonth() !== periodStart.getUTCMonth()
  );
}

export async function requireSearchEntitlement(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const user = await ensureUser(getAuth(request));

  if (
    (user.subscriptionTier === 'premium' || user.subscriptionTier === 'team') &&
    (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing')
  ) {
    next();
    return;
  }

  if (isNewLookupPeriod(user.searchLookupPeriodStart)) {
    user.searchLookupsUsed = 0;
    user.searchLookupPeriodStart = new Date();
  }

  const quota = Number(process.env.FREE_SEARCH_LOOKUPS_PER_MONTH ?? DEFAULT_FREE_LOOKUPS_PER_MONTH);

  if (user.searchLookupsUsed >= quota) {
    response.status(402).json({
      error: 'Free search quota exceeded. Upgrade to continue academic source lookups.',
      quota,
      used: user.searchLookupsUsed,
    });
    return;
  }

  user.searchLookupsUsed += 1;
  await user.save();
  next();
}
