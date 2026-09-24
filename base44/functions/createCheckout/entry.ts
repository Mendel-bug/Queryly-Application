import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const PRICE_ID = 'price_1UGe9FRXC4YhpBq3XpaA2QDq';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const origin = body.origin || 'https://example.com';
    const sk = secrets.get('STRIPE_SECRET_KEY');
    const appId = secrets.get('BASE44_APP_ID');

    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', PRICE_ID);
    params.append('line_items[0][quantity]', '1');
    params.append('success_url', `${origin}?checkout=success`);
    params.append('cancel_url', `${origin}?checkout=cancel`);
    params.append('client_reference_id', user.id);
    params.append('customer_email', user.email);
    params.append('metadata[base44_app_id]', appId);
    params.append('metadata[user_id]', user.id);
    params.append('subscription_data[metadata][base44_app_id]', appId);
    params.append('subscription_data[metadata][user_id]', user.id);

    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sk}`,
        'Stripe-Version': '2025-10-29.clover',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: params,
    });
    const session = await r.json();
    if (!r.ok) return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 502 });
    return Response.json({ url: session.url });
  } catch (error) {
    console.log('createCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}