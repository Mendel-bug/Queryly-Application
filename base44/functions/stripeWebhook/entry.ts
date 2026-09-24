import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import Stripe from 'npm:stripe';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const sig = req.headers.get('stripe-signature');
    const rawBody = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      secrets.get('STRIPE_WEBHOOK_SECRET')
    );

    const data = event.data.object;

    if (event.type === 'checkout.session.completed') {
      const userId = data.client_reference_id || data.metadata?.user_id;
      const subId = data.subscription;
      const sub = await stripe.subscriptions.retrieve(subId);
      await upsertUsage(base44, userId, {
        subscription_status: 'active',
        subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
        stripe_customer_id: data.customer,
        stripe_subscription_id: subId,
      });
    } else if (event.type === 'customer.subscription.updated') {
      const userId = data.metadata?.user_id;
      await upsertUsage(base44, userId, {
        subscription_status: mapStatus(data.status),
        subscription_end: new Date(data.current_period_end * 1000).toISOString(),
        stripe_customer_id: data.customer,
        stripe_subscription_id: data.id,
      });
    } else if (event.type === 'customer.subscription.deleted') {
      const userId = data.metadata?.user_id;
      await upsertUsage(base44, userId, {
        subscription_status: 'canceled',
        subscription_end: new Date(data.current_period_end * 1000).toISOString(),
      });
    }

    return Response.json({ received: true });
  } catch (error) {
    console.log('stripeWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
}

async function upsertUsage(base44, userId, fields) {
  if (!userId) return;
  const existing = (await base44.asServiceRole.entities.UserUsage.filter({ created_by_id: userId }))[0];
  if (existing) {
    await base44.asServiceRole.entities.UserUsage.update(existing.id, fields);
  } else {
    await base44.asServiceRole.entities.UserUsage.create({
      created_by_id: userId,
      prompt_count: 0,
      subscription_status: 'free',
      ...fields,
    });
  }
}

function mapStatus(s) {
  if (s === 'active' || s === 'trialing') return 'active';
  if (s === 'canceled' || s === 'unpaid' || s === 'incomplete_expired') return 'canceled';
  return 'active';
}