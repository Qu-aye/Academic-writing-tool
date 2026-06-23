import crypto from 'node:crypto';
import { Router } from 'express';
import { UserModel, type SubscriptionTier } from '../models/User.js';

export const stripeWebhooksRouter = Router();

function getTier(metadata: any): SubscriptionTier {
  const metadataTier = metadata?.tier;

  if (metadataTier === 'premium' || metadataTier === 'team') {
    return metadataTier;
  }

  return 'premium';
}

// IMPORTANT: Paystack sends regular JSON objects, NOT raw text payloads.
// Ensure your app uses express.json() for this route, NOT express.raw()
stripeWebhooksRouter.post('/', async (request, response) => {
  // 1. Validate the Paystack Webhook Signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY ?? '')
    .update(JSON.stringify(request.body))
    .digest('hex');

  if (hash !== request.headers['x-paystack-signature']) {
    response.status(401).send('Invalid signature');
    return;
  }

  // 2. Extract Event Data
  const event = request.body;

  // Handle Successful Subscription / First Payment Charge
  if (event.event === 'charge.success') {
    const data = event.data;
    const metadata = data.metadata;
    const firebaseUid = metadata?.firebaseUid;

    // Paystack pairs user profiles to unique "customer_code" strings
    const paystackCustomerCode = data.customer.customer_code;
    // If using Paystack Subscription Plans, it passes a subscription code string
    const paystackSubscriptionCode = data.plan?.plan_code ?? 'one_time_charge';

    await UserModel.findOneAndUpdate(
      firebaseUid ? { firebaseUid } : { stripeCustomerId: paystackCustomerCode },
      {
        $set: {
          firebaseUid,
          // Mapping Paystack fields directly to your existing database keys 
          // so you don't have to rewrite your entire User schema right now
          stripeCustomerId: paystackCustomerCode,
          stripeSubscriptionId: paystackSubscriptionCode,
          subscriptionTier: getTier(metadata),
          subscriptionStatus: 'active',
        },
      },
      { upsert: Boolean(firebaseUid) },
    );
  }

  // Handle Subscription Expiration or Cancellation
  if (event.event === 'subscription.disable') {
    const data = event.data;

    await UserModel.findOneAndUpdate(
      { stripeSubscriptionId: data.subscription_code },
      {
        $set: {
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
        },
      },
    );
  }

  // Paystack expects a simple 200 OK text/json receipt confirmation
  response.sendStatus(200);
});
