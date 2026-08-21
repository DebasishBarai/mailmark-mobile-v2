/**
 * Marketing copy transcribed from mailmark.dev. Section numbering matches the
 * rail on the website so the two stay comparable when the site changes.
 *
 * The FAQ answers are the one exception: the site renders them client-side, so
 * they are written here from the facts stated elsewhere on the page (plans,
 * trial terms, warm-up window, SDK) rather than copied.
 */

import type { IconName } from '@/components/ui/icon';

export const SITE_URL = 'https://www.mailmark.dev';
export const DOCS_URL = 'https://www.mailmark.dev/docs';

export const HERO = {
  eyebrow: 'Built for multi-product developers',
  titleLead: 'One email system for',
  titleEmphasis: 'every',
  titleTrail: 'product you ship.',
  body: 'Every app needs its own domain. Every domain needs its own mailboxes just to talk to users. Run four products and you’re maintaining four domains, a dozen mailboxes, and five separate tools, before you’ve sent a single email. Mailmark is all of it, once.',
  primaryCta: 'See How It Works',
  secondaryCta: 'Start free trial',
  tagline: 'One login for every product. No more tool sprawl.',
} as const;

/** Section 02 — the per-product cost model behind the calculator. */
export const COST_MODEL = {
  mailboxesPerProduct: 3,
  perMailboxMonthly: 7,
  sendingApiMonthly: 20,
  campaignToolMonthly: 39,
  warmupPerProductMonthly: 15,
  deliverabilityMonthly: 55,
  proPlanMonthly: 50,
  footnote:
    'Costs use approximate US list prices as of August 2026, taking the cheaper credible option in each category: $7 per mailbox (Google Workspace Business Starter, annual billing), $20 for a sending API (Resend Pro, 50,000 emails), $39 for a campaign tool (Kit Creator, 1,000 subscribers), $15 per warmed sending address (Warmbox, one per product) and $55 for deliverability monitoring (GlockApps Essential). Your own stack will differ. Mailmark plans carry their own monthly sending limits.',
} as const;

export type HowItWorksStep = {
  step: number;
  title: string;
  body: string;
  bullets: string[];
  icon: IconName;
};

/** Section 03 — "From a bare domain to talking to users". */
export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: 1,
    title: "Add Every Product's Domain",
    body: 'Bring all your products under one roof. Add each domain and Mailmark walks you through DNS setup step by step, including MX, SPF, DKIM, and DMARC. No more logging into a different provider for every app you ship.',
    bullets: [
      'Add unlimited product domains',
      'Guided DNS setup with auto-verify',
      'MX, SPF, DKIM & DMARC in one flow',
    ],
    icon: 'domain',
  },
  {
    step: 2,
    title: 'One Inbox Per Product',
    body: 'Spin up the mailboxes each product needs: hello@, support@, team@. Every product’s mail lives in its own inbox, but you manage them all from a single dashboard instead of a dozen logins.',
    bullets: [
      'One-click mailbox creation',
      'Per-mailbox sender signatures',
      'Every product’s inbox in one place',
    ],
    icon: 'inbox',
  },
  {
    step: 3,
    title: 'Reply From a Familiar Inbox',
    body: 'When a user replies, it lands in a familiar email UI: Inbox, Sent, Outbox, Drafts, and Trash. Answer support questions, manage conversations, and search across every product’s mail without leaving Mailmark.',
    bullets: [
      'Gmail-like inbox for every product',
      'Rich text composer with attachments',
      'Full-text search across all mail',
    ],
    icon: 'reply',
  },
  {
    step: 4,
    title: 'Send Updates to Your Users',
    body: 'Shipped v2? Tell everyone at once. Pick a mailbox, drop in your user list, personalize with merge tags, and send. Each person gets their own email, so it never looks like a mass blast with the whole list in the To field.',
    bullets: [
      'Mail merge so every email feels personal',
      'No visible recipient list, one email each',
      'Real-time open, click & reply tracking',
    ],
    icon: 'campaign',
  },
];

/** Section 04 — the SDK snippet shown under "For your code". */
export const SDK_SNIPPET = `import { Mailmark } from 'mailmark-sdk';

const client = new Mailmark(process.env.MAILMARK_API_KEY);

// Transactional: welcome a new signup from your app
await client.send({
  from: 'hello@app-one.com',
  to: [user.email],
  subject: 'Welcome to App One',
  html: '<h1>You are in.</h1>',
});

// Campaign: tell every user v2 shipped, one email each
await client.send({
  from: 'hello@app-one.com',
  to: userEmails,
  subject: 'v2.0 is live',
  html: releaseNotesHtml,
  type: 'campaign',
});`;

export const SDK_BULLETS = [
  'One API key per domain, scoped to that product',
  'Transactional sends and campaign sends from the same endpoint',
  'Schedule sends, run sequences, and pull delivery stats programmatically',
  'Fully typed mailmark-sdk package for TypeScript and JavaScript',
];

export type Feature = { title: string; body: string; icon: IconName };

/** Section 06 — "Everything your products need to talk to users". */
export const FEATURES: Feature[] = [
  {
    title: 'Multi-Domain Management',
    body: "Add every product's domain and manage them side by side. Guided DNS setup gets each one inbox-ready in minutes.",
    icon: 'domain',
  },
  {
    title: 'Unlimited Mailboxes',
    body: 'Create hello@, support@, team@ for every product you run. Send from addresses your users recognize and trust.',
    icon: 'inbox',
  },
  {
    title: 'Full Email UI',
    body: 'Manage replies and conversations with a familiar Gmail-like interface. Every product’s mail in one place, not a dozen tabs.',
    icon: 'mail',
  },
  {
    title: 'Product Update Campaigns',
    body: 'Announce a launch or new feature to your whole user base with mail merge, dynamic fields, and automated follow-ups. Personal, never a mass blast.',
    icon: 'campaign',
  },
  {
    title: 'REST API & npm SDK',
    body: 'Send transactional and campaign emails straight from your apps. One API key and the mailmark-sdk package is all your code needs.',
    icon: 'api',
  },
  {
    title: 'Campaign Analytics',
    body: 'Track opens, clicks, replies, and bounces in real time. Know exactly how every campaign performs.',
    icon: 'analytics',
  },
  {
    title: '28-Day Inbox Warming',
    body: 'Every new product domain starts cold. Mailmark ramps up volume over 28 days so Gmail and Outlook trust your mail from day one.',
    icon: 'flame',
  },
  {
    title: 'Deliverability Monitoring',
    body: 'Continuously monitor SPF, DKIM, DMARC, and blacklist status across every domain. Get alerted before a problem reaches your users.',
    icon: 'shield',
  },
  {
    title: 'Unsubscribe Management',
    body: 'Stay compliant with one-click unsubscribe for Gmail and Yahoo. Opted-out users are skipped automatically across every product.',
    icon: 'unsubscribe',
  },
  {
    title: 'Inbox Placement Testing',
    body: 'Test every send against Gmail, Outlook, and Yahoo seed inboxes. Know whether you land in Primary, Promotions, or Spam before you hit send.',
    icon: 'placement',
  },
  {
    title: 'Team Collaboration',
    body: 'Bringing on a cofounder or contractor? Invite them, assign mailboxes per product, and manage permissions from one dashboard.',
    icon: 'team',
  },
];

export type Testimonial = { quote: string; name: string; role: string };

/** Section 08 — "Loved by businesses everywhere". */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'We switched all our outreach campaigns to Mailmark. Setting up our domain took 5 minutes, and now every campaign goes out from our own address. Open rates jumped 30%.',
    name: 'Mailmark User',
    role: 'Head of Sales',
  },
  {
    quote:
      'Finally, one platform for running email campaigns with real deliverability. No more juggling Mailchimp, a warming tool, and a separate inbox for replies.',
    name: 'Seasoned Entrepreneur',
    role: 'Startup Founder',
  },
  {
    quote:
      'The campaign tools are powerful and the reply management feels just like Gmail. I run outreach from sales@ and newsletters from updates@, all in one place.',
    name: 'Mailmark User',
    role: 'Marketing Director',
  },
];

export type PlanId = 'starter' | 'pro' | 'business';

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  blurb: string;
  trial: boolean;
  popular?: boolean;
  monthlySends: number;
  domains: number | 'unlimited';
  mailboxes: number | 'unlimited';
  features: string[];
};

/** Section 09 — "Priced by how much you ship". */
export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 10,
    blurb: "Perfect for your first product's email.",
    trial: true,
    monthlySends: 1000,
    domains: 1,
    mailboxes: 3,
    features: [
      '1,000 emails / month',
      '1 custom domain',
      '3 mailboxes',
      'Full email UI',
      'User campaigns',
      'REST API & npm SDK',
      'Basic support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 50,
    blurb: 'For developers running several products at once.',
    trial: true,
    popular: true,
    monthlySends: 25000,
    domains: 5,
    mailboxes: 'unlimited',
    features: [
      '25,000 emails / month',
      '5 custom domains',
      'Unlimited mailboxes',
      'Full email UI',
      'User campaigns',
      'REST API & npm SDK',
      'Priority support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 100,
    blurb: 'For a whole portfolio of products, with room to grow.',
    trial: false,
    monthlySends: 100000,
    domains: 'unlimited',
    mailboxes: 'unlimited',
    features: [
      '100,000 emails / month',
      'Unlimited domains',
      'Unlimited mailboxes',
      'Full email UI',
      'User campaigns',
      'REST API & npm SDK',
      'Dedicated support',
    ],
  },
];

export const PRICING_NOTE =
  'Starter and Pro include a 7-day free trial. Billing details are taken when you start it, nothing is charged until day 8, and cancelling before then costs you nothing.';

export const FAQ: { question: string; answer: string }[] = [
  {
    question: 'What is Mailmark?',
    answer:
      'One email platform for every product you ship. Add your domains, create the mailboxes each product needs, handle replies in a full email UI, run campaigns to your users, and send from your own code through the REST API — all from a single dashboard.',
  },
  {
    question: 'Can I use my own custom domain?',
    answer:
      'Yes. Add each product domain and Mailmark walks you through MX, SPF, DKIM, and DMARC step by step, then auto-verifies the records. Starter covers 1 domain, Pro covers 5, Business is unlimited.',
  },
  {
    question: 'How many mailboxes can I create?',
    answer:
      'Starter includes 3 mailboxes. Pro and Business are unlimited, so you can run hello@, support@, team@ and billing@ across every product without counting.',
  },
  {
    question: 'What campaign features are included?',
    answer:
      'Mail merge with dynamic fields, multi-stage automated follow-ups, and real-time tracking for opens, clicks, replies, and bounces. Each recipient gets their own email, so the To field never shows your whole list.',
  },
  {
    question: 'Can I send email from my own app?',
    answer:
      'Yes. Every domain gets its own API key scoped to that product. Transactional and campaign sends hit the same endpoint, and the fully typed mailmark-sdk package covers TypeScript and JavaScript.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Starter and Pro include a 7-day free trial with full access. Billing details are taken when you start it, nothing is charged until day 8, and cancelling before then costs you nothing.',
  },
  {
    question: 'How does billing work?',
    answer:
      'Plans are billed monthly: Starter $10, Pro $50, Business $100. Each plan carries its own monthly sending limit — 1,000, 25,000, and 100,000 emails respectively.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes. Cancel whenever you like, including during the 7-day trial, and you keep access through the end of the period you have paid for.',
  },
  {
    question: 'Does Mailmark have email warmup?',
    answer:
      'Built in. Every new product domain starts cold, so Mailmark ramps sending volume over 28 days and monitors SPF, DKIM, DMARC and blacklist status the whole time.',
  },
  {
    question: 'What email clients or apps can I use with Mailmark?',
    answer:
      'Mailmark ships its own inbox — web, and this app — with Inbox, Sent, Outbox, Drafts, and Trash. Search runs across every product’s mail, so you do not need a separate client to answer a user.',
  },
];

export const CTA = {
  title: 'Put all your products’ email in one place',
  body: 'Add your domains, create mailboxes, send updates to your users, and wire up the API, all from one dashboard. Try free for 7 days, no credit card required.',
  action: 'Start free trial',
} as const;

export const FOOTER_TAGLINE = 'Email campaigns from your own domain. Built-in deliverability.';

export const FOOTER_LINKS: { heading: string; links: { label: string; path: string }[] }[] = [
  {
    heading: 'Tools',
    links: [
      { label: 'Deliverability Checker', path: '/tools/deliverability-checker' },
      { label: 'Lead Finder', path: '/tools/lead-finder' },
      { label: 'Email List Validator', path: '/tools/email-list-validator' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', path: '/blog' },
      { label: 'Documentation', path: '/docs' },
      { label: 'DNS Setup Guide', path: '/dns-setup-guide' },
      { label: 'Email Deliverability', path: '/email-deliverability' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', path: '/about' },
      { label: 'Contact', path: '/contact' },
      { label: 'Careers', path: '/careers' },
      { label: 'Affiliate Program', path: '/affiliate' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', path: '/privacy' },
      { label: 'Terms of Service', path: '/terms' },
      { label: 'Security', path: '/security' },
      { label: 'System Status', path: '/status' },
    ],
  },
];
