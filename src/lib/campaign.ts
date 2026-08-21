import type { BadgeTone } from '@/components/ui';
import type { CampaignStatus } from '@/data/types';

export const STATUS_TONE: Record<CampaignStatus, BadgeTone> = {
  draft: 'neutral',
  scheduled: 'info',
  sending: 'accent',
  sent: 'success',
};

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
};
