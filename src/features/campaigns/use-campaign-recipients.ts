import type { Email } from '@/lib/convex/types';

import { useCampaignIndex, useLoadFolders } from './campaign-index';
import { foldersToRead } from './history';

// Messages loaded automatically while looking for, or counting, a campaign.
const AUTO_LOAD = 5_000;

/**
 * Every recipient of one campaign, from the Sent and Outbox pages the campaign
 * index has loaded: the same data the website's Campaigns pages group by
 * batchId. The mailbox is read back until the campaign is complete (see
 * foldersToRead), so its figures are final rather than partial.
 */
export function useCampaignRecipients(batchId: string): {
  emails: Email[];
  /** Still looking for the campaign, or still counting it. */
  loading: boolean;
  /** Every message of it is loaded. */
  complete: boolean;
  /** Stopped at the automatic limit; `keepCounting` carries on. */
  paused: boolean;
  keepCounting: () => void;
  error?: Error;
} {
  const index = useCampaignIndex();
  const campaign = index.byId(batchId);
  const toRead = campaign ? foldersToRead(campaign, index.progress) : index.loadable;
  const loader = useLoadFolders(toRead, AUTO_LOAD);
  return {
    emails: campaign?.emails ?? [],
    loading: index.loading || (toRead.length > 0 && !loader.paused),
    complete: !!campaign && toRead.length === 0,
    paused: loader.paused,
    keepCounting: loader.more,
    error: index.error,
  };
}
