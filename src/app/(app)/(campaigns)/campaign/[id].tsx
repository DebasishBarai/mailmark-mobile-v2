import { useLocalSearchParams } from 'expo-router';

import { CampaignScreen } from '@/features/campaigns/campaign-screen';

export default function CampaignRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CampaignScreen batchId={decodeURIComponent(id)} />;
}
