/**
 * The "Get set up" checklist: the five steps from signing up to a first
 * campaign, each worked out from the account itself, so it ticks itself off
 * and never disagrees with what the owner sees elsewhere. Ported from the
 * website's lib/setupChecklist.ts (same steps, rules and wording, with the
 * app's screens as links) and checked against its tests.
 */

export type ChecklistDomain = {
  _id: string;
  _creationTime: number;
  domain: string;
  verified: boolean;
  postalAddress?: string;
};

export type ChecklistMailbox = { domainId: string };

export type StepId = 'domain' | 'dns' | 'mailbox' | 'address' | 'campaign';

/** Where a step's button goes: an app route and its params. */
export type StepRoute = { pathname: string; params?: Record<string, string> };

export type ChecklistStep = {
  id: StepId;
  title: string;
  detail: string;
  done: boolean;
  route: StepRoute;
  /** The step's button label. */
  action: string;
};

export type Checklist = {
  steps: ChecklistStep[];
  doneCount: number;
  /** The first step not done yet, or null when everything is. */
  current: StepId | null;
  /** The domain the steps are about. */
  domain: ChecklistDomain | null;
  /** The domain exists but its DNS records are not verified yet. */
  waitingForDns: boolean;
};

/**
 * The domain the steps follow when there are several: the one furthest
 * along (verified, then with a mailbox, then with an address), the oldest
 * among equals.
 */
export function pickSetupDomain(domains: ChecklistDomain[], mailboxes: ChecklistMailbox[]): ChecklistDomain | null {
  const withMailbox = new Set(mailboxes.map((m) => m.domainId));
  const score = (d: ChecklistDomain) => (d.verified ? 4 : 0) + (withMailbox.has(d._id) ? 2 : 0) + (d.postalAddress ? 1 : 0);
  let best: ChecklistDomain | null = null;
  for (const d of domains) {
    if (!best || score(d) > score(best) || (score(d) === score(best) && d._creationTime < best._creationTime)) best = d;
  }
  return best;
}

export function setupChecklist(input: {
  domains: ChecklistDomain[];
  mailboxes: ChecklistMailbox[];
  hasCampaign: boolean;
}): Checklist {
  const d = pickSetupDomain(input.domains, input.mailboxes);
  const domainScreen: StepRoute = d ? { pathname: '/domain/[id]', params: { id: d._id } } : { pathname: '/domains' };
  const waitingForDns = !!d && !d.verified;

  const steps: ChecklistStep[] = [
    {
      id: 'domain',
      title: 'Add your domain',
      detail: 'The web address your business email will use, like joesplumbing.com.',
      done: !!d,
      route: { pathname: '/add-domain' },
      action: 'Add domain',
    },
    {
      id: 'dns',
      title: 'Add the DNS records',
      detail: waitingForDns
        ? "Waiting for your DNS records. Once they're added where you bought your domain, this can take up to a few hours."
        : 'Copy a few records into the place you bought your domain, like GoDaddy or Cloudflare. We check them for you.',
      done: !!d?.verified,
      route: domainScreen,
      action: 'Add DNS records',
    },
    {
      id: 'mailbox',
      title: 'Create a mailbox',
      detail: `An address such as hello@${d?.domain ?? 'yourbusiness.com'} to send and receive email.`,
      done: !!d && input.mailboxes.some((m) => m.domainId === d._id),
      route: d ? { pathname: '/new-mailbox', params: { domainId: d._id } } : { pathname: '/domains' },
      action: 'Create mailbox',
    },
    {
      id: 'address',
      title: 'Add your business mailing address',
      detail: 'US law requires it at the bottom of marketing email. A P.O. box is fine.',
      done: !!d?.postalAddress,
      route: d ? { pathname: '/business-address', params: { domainId: d._id } } : { pathname: '/domains' },
      action: 'Add address',
    },
    {
      id: 'campaign',
      title: 'Send your first campaign',
      detail: 'Pick a ready-made message, like a review request, and send it to your customers.',
      done: input.hasCampaign,
      route: { pathname: '/campaign-new' },
      action: 'Start a campaign',
    },
  ];

  return {
    steps,
    doneCount: steps.filter((s) => s.done).length,
    current: steps.find((s) => !s.done)?.id ?? null,
    domain: d,
    waitingForDns,
  };
}
