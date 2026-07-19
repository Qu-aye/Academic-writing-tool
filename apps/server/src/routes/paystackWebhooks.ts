import crypto from 'node:crypto';
import { Router } from 'express';
import { requireAuth, getAuth } from '../middleware/auth.js';
import { UserModel, type SubscriptionTier } from '../models/User.js';

export const paystackWebhooksRouter = Router();

// Checkout endpoint to create payment link
paystackWebhooksRouter.post('/checkout', requireAuth, async (request, response) => {
  const { tier } = request.body as { tier: 'premium' | 'team' };
  if (!tier || (tier !== 'premium' && tier !== 'team')) {
    response.status(400).json({ error: 'Invalid tier' });
    return;
  }

  const amount = tier === 'premium' ? 1999 : 4999; // in kobo (Nigerian currency) - 20.99 and 49.99

  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    const auth = getAuth(request);
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: auth.email || '',
        amount,
        metadata: {
          firebaseUid: auth.uid,
          tier,
        },
      }),
    });

    const data = await paystackResponse.json();
    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize payment');
    }

    response.json({ authorizationUrl: data.data.authorization_url });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'Payment initialization failed' });
  }
});

function getTier(metadata: any): SubscriptionTier {
  const metadataTier = metadata?.tier;

  if (metadataTier === 'premium' || metadataTier === 'team') {
    return metadataTier;
  }

  return 'premium';
}

// Paystack sends regular JSON objects, NOT raw text payloads.
// Ensure your app uses express.json() for this route, NOT express.raw()
paystackWebhooksRouter.post('/', async (request, response) => {
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
      firebaseUid ? { firebaseUid } : { paystackCustomerId: paystackCustomerCode },
      {
        $set: {
          firebaseUid,
          paystackCustomerId: paystackCustomerCode,
          paystackSubscriptionId: paystackSubscriptionCode,
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
      { paystackSubscriptionId: data.subscription_code },
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