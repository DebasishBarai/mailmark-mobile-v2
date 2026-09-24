import type { Email } from '@/lib/convex/types';

export type CampaignStats = {
  total: number;
  pending: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  failed: number;
  complained: number;
  blocked: number;
  scheduled: number;
};

/**
 * Tally a campaign's messages the way the backend's batch stats do
 * (foldEmailIntoBatch in convex/emails.ts): an open implies delivery, and
 * bounced/failed/complained/blocked are counted from deliveryStatus.
 */
export function campaignStats(emails: Email[]): CampaignStats {
  const s: CampaignStats = {
    total: emails.length,
    pending: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
    bounced: 0,
    failed: 0,
    complained: 0,
    blocked: 0,
    scheduled: 0,
  };
  for (const e of emails) {
    if (e.folder === 'outbox') {
      s.scheduled++;
      continue;
    }
    switch (e.deliveryStatus) {
      case 'delivered':
        s.delivered++;
        break;
      case 'bounced':
        s.bounced++;
        break;
      case 'failed':
        s.failed++;
        break;
      case 'complained':
        s.complained++;
        s.delivered++;
        break;
      case 'blocked':
        s.blocked++;
        break;
      case 'pending':
        if (e.openedAt) s.delivered++;
        else s.pending++;
        break;
      default:
        if (e.openedAt) s.delivered++;
    }
    if (e.openedAt) s.opened++;
    if (e.clickedLinks && e.clickedLinks.length > 0) s.clicked++;
    if (e.repliedAt) s.replied++;
  }
  return s;
}

export function rate(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

export type RecipientFilter = 'all' | 'pending' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'problems';

export function matchesFilter(e: Email, filter: RecipientFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'pending':
      return e.folder === 'outbox' || (e.deliveryStatus === 'pending' && !e.openedAt);
    case 'delivered':
      return e.deliveryStatus === 'delivered' || !!e.openedAt;
    case 'opened':
      return !!e.openedAt;
    case 'clicked':
      return !!e.clickedLinks?.length;
    case 'replied':
      return !!e.repliedAt;
    case 'problems':
      return ['bounced', 'failed', 'complained', 'blocked'].includes(e.deliveryStatus ?? '');
  }
}
