import { Stack } from 'expo-router';

import { CampaignIndexProvider } from '@/features/campaigns/campaign-index';
import { useStackOptions } from '@/hooks/use-stack-options';

export const unstable_settings = { anchor: 'campaigns' };

export default function CampaignsLayout() {
  const options = useStackOptions();
  return (
    <CampaignIndexProvider>
      <Stack screenOptions={options}>
        <Stack.Screen name="campaigns" options={{ title: 'Campaigns', headerLargeTitle: true }} />
        <Stack.Screen name="campaign/[id]" options={{ title: 'Campaign' }} />
        <Stack.Screen name="sequence/[id]" options={{ title: 'Follow-up sequence' }} />
      </Stack>
    </CampaignIndexProvider>
  );
}
