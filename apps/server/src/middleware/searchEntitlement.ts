import type { NextFunction, Request, Response } from 'express';
import { getAuth } from './auth.js';
import { UserModel } from '../models/User.js';

const FREE_TIER_MONTHLY_LIMIT = 10;

export async function requireSearchEntitlement(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const auth = getAuth(request);
    const user = await UserModel.findOne({ firebaseUid: auth.uid });

    if (!user) {
      // User not yet synced — allow a few searches
      next();
      return;
    }

    // Premium/team users have unlimited searches
    if (user.subscriptionTier === 'premium' || user.subscriptionTier === 'team') {
      next();
      return;
    }

    // Free tier: enforce monthly quota
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count searches this month (tracked via a simple counter on the user doc)
    const searchCountThisMonth = user.searchCountResetAt && user.searchCountResetAt >= monthStart
      ? (user.searchCount ?? 0)
      : 0;

    if (searchCountThisMonth >= FREE_TIER_MONTHLY_LIMIT) {
      response.status(402).json({
        error: 'Search quota exceeded. Upgrade to premium for unlimited searches.',
        quota: { used: searchCountThisMonth, limit: FREE_TIER_MONTHLY_LIMIT },
      });
      return;
    }

    // Increment search count
    await UserModel.findOneAndUpdate(
      { firebaseUid: auth.uid },
      {
        $inc: { searchCount: 1 },
        $set: { searchCountResetAt: monthStart },
      },
    );

    next();
  } catch {
    // If user lookup fails, allow the search to proceed
    next();
  }
}
