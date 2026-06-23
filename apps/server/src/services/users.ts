import type { AuthenticatedUser } from '../middleware/auth.js';
import { UserModel } from '../models/User.js';

export async function ensureUser(auth: AuthenticatedUser) {
  return UserModel.findOneAndUpdate(
    { firebaseUid: auth.uid },
    {
      $setOnInsert: {
        firebaseUid: auth.uid,
        subscriptionTier: 'free',
        subscriptionStatus: 'none',
      },
      $set: {
        email: auth.email,
        displayName: auth.name,
      },
    },
    { new: true, upsert: true },
  );
}
