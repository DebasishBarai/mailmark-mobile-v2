import type { Email } from '@/lib/convex/types';

import { useCampaignIndex } from './campaign-index';

/**
 * Every recipient of one campaign found in the Sent and Outbox pages the
 * campaign index has loaded: the same data the website's Sent folder groups
 * by batchId. `complete` is false while older pages remain unloaded, so a
 * very large campaign can say its figures are partial.
 */
export function useCampaignRecipients(batchId: string): {
  emails: Email[];
  loading: boolean;
  complete: boolean;
  error?: Error;
} {
  const index = useCampaignIndex();
  const campaign = index.byId(batchId);
  return {
    emails: campaign?.emails ?? [],
    loading: index.loading && !campaign,
    complete: !index.canLoadMore,
    error: index.error,
  };
}
