import { Router } from 'express';
import Stripe from 'stripe';
import { UserModel, type SubscriptionTier } from '../models/User.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-05-27.dahlia',
});

export const stripeWebhooksRouter = Router();

function getTier(subscription: Stripe.Subscription): SubscriptionTier {
  const metadataTier = subscription.metadata.tier;

  if (metadataTier === 'premium' || metadataTier === 'team') {
    return metadataTier;
  }

  return 'premium';
}

stripeWebhooksRouter.post('/', async (request, response) => {
  const signature = request.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    response.status(400).send('Missing Stripe signature.');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    );
  } catch (error) {
    response.status(400).send(error instanceof Error ? error.message : 'Invalid webhook.');
    return;
  }

  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const firebaseUid = subscription.metadata.firebaseUid;

    await UserModel.findOneAndUpdate(
      firebaseUid ? { firebaseUid } : { stripeCustomerId: String(subscription.customer) },
      {
        $set: {
          firebaseUid,
          stripeCustomerId: String(subscription.customer),
          stripeSubscriptionId: subscription.id,
          subscriptionTier: getTier(subscription),
          subscriptionStatus: subscription.status,
        },
      },
      { upsert: Boolean(firebaseUid) },
    );
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;

    await UserModel.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        $set: {
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
        },
      },
    );
  }

  response.json({ received: true });
});
