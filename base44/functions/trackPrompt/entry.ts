import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const FREE_LIMIT = 10;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let usage = (await base44.entities.UserUsage.filter({}))[0];
    if (!usage) {
      usage = await base44.entities.UserUsage.create({ prompt_count: 0, subscription_status: 'free' });
    }

    const subActive =
      usage.subscription_status === 'active' &&
      (!usage.subscription_end || new Date(usage.subscription_end) > new Date());

    if (subActive) {
      return Response.json({ allowed: true, remaining: -1, subscription_status: 'active', limit: FREE_LIMIT });
    }

    if ((usage.prompt_count || 0) >= FREE_LIMIT) {
      return Response.json({ allowed: false, remaining: 0, subscription_status: 'free', limit: FREE_LIMIT });
    }

    const updated = await base44.entities.UserUsage.update(usage.id, {
      prompt_count: (usage.prompt_count || 0) + 1,
    });
    return Response.json({
      allowed: true,
      remaining: FREE_LIMIT - (updated.prompt_count || 0),
      subscription_status: 'free',
      limit: FREE_LIMIT,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}