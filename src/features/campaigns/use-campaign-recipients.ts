import { useEffect } from 'react';

import { api } from '@/lib/convex/api';
import { useLivePaginated, useMobileCapabilities } from '@/lib/convex/hooks';
import type { Email } from '@/lib/convex/types';

import { useCampaignIndex } from './campaign-index';

const AUTO_LOAD_LIMIT = 5000;

/**
 * Every recipient of one campaign.
 *
 * With the mobile backend extension deployed this reads the campaign by its
 * batchId index (mobile.campaignRecipients), so a campaign of any size and
 * age is complete. Without it, the campaign is whatever of it is in the
 * recent Sent/Outbox pages the campaign index has loaded, and `complete` says
 * so honestly.
 */
export function useCampaignRecipients(batchId: string): {
  emails: Email[];
  loading: boolean;
  complete: boolean;
  source: 'backend' | 'recent';
  error?: Error;
} {
  const caps = useMobileCapabilities();
  const index = useCampaignIndex();
  const useBackend = !!caps?.campaignRecipients;
  const page = useLivePaginated(api.mobile.campaignRecipients, useBackend ? { batchId } : 'skip', 200);

  const { canLoadMore, loadMore, items } = page;
  useEffect(() => {
    if (useBackend && canLoadMore && items.length < AUTO_LOAD_LIMIT) loadMore();
  }, [useBackend, canLoadMore, items.length, loadMore]);

  if (useBackend) {
    return {
      emails: items,
      loading: page.status === 'loading',
      complete: !canLoadMore,
      source: 'backend',
      error: page.error,
    };
  }
  const campaign = index.byId(batchId);
  return {
    emails: campaign?.emails ?? [],
    loading: caps === undefined || (index.loading && !campaign),
    complete: !index.canLoadMore,
    source: 'recent',
    error: index.error,
  };
}
