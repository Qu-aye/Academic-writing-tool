import { Schema, model, type InferSchemaType } from 'mongoose';

export type SubscriptionTier = 'free' | 'premium' | 'team';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'
  | 'none';

const userSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    displayName: { type: String },
    subscriptionTier: {
      type: String,
      enum: ['free', 'premium', 'team'],
      default: 'free',
      required: true,
    },
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, index: true },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid', 'none'],
      default: 'none',
      required: true,
    },
    searchLookupsUsed: { type: Number, default: 0, required: true },
    searchLookupPeriodStart: { type: Date, default: () => new Date(), required: true },
  },
  { timestamps: true },
);

export type UserRecord = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
