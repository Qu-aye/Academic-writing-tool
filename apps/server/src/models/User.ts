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
    paystackCustomerId: { type: String, index: true },
    paystackSubscriptionId: { type: String, index: true },
    searchCount: { type: Number, default: 0 },
    searchCountResetAt: { type: Date },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'unpaid', 'none'],
      default: 'none',
      required: true,
    },
  },
  { timestamps: true },
);

export type UserRecord = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
