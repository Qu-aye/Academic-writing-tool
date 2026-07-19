import { Router } from 'express';
import { getAuth } from '../middleware/auth.js';
import { UserModel } from '../models/User.js';

export const usersRouter = Router();

usersRouter.get('/me', async (request, response) => {
  const auth = getAuth(request);
  const user = await UserModel.findOne({ firebaseUid: auth.uid }).select(
    'subscriptionTier subscriptionStatus searchCount searchCountResetAt email displayName',
  );
  if (!user) {
    response.status(404).json({ error: 'User profile not found.' });
    return;
  }
  response.json({
    user: {
      email: user.email,
      displayName: user.displayName,
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      searchCount: user.searchCount,
      searchCountResetAt: user.searchCountResetAt,
    },
  });
});
