import type { Plan } from '@/lib/convex/types';

/** Mirrors PLAN_LIMITS in convex/quotas.ts and PLANS in convex/subscriptions.ts. */
export const PLAN_DETAILS: Record<
  'starter' | 'pro' | 'business',
  { name: string; priceMonthly: number; features: string[] }
> = {
  starter: {
    name: 'Starter',
    priceMonthly: 10,
    features: ['1 domain', '3 mailboxes', '1,000 emails / month', '500 recipients'],
  },
  pro: {
    name: 'Pro',
    priceMonthly: 50,
    features: ['5 domains', 'Unlimited mailboxes', '25,000 emails / month', '10,000 recipients'],
  },
  business: {
    name: 'Business',
    priceMonthly: 100,
    features: ['Unlimited domains', 'Unlimited mailboxes', '100,000 emails / month', '50,000 recipients'],
  },
};

export function planName(plan: Plan | undefined): string {
  if (!plan) return '—';
  if (plan === 'free') return 'Free';
  return PLAN_DETAILS[plan].name;
}
