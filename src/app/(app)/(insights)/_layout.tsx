import { Stack } from 'expo-router';

import { useStackOptions } from '@/hooks/use-stack-options';

export const unstable_settings = { anchor: 'insights' };

export default function InsightsLayout() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="insights" options={{ title: 'Insights', headerLargeTitle: true }} />
    </Stack>
  );
}
