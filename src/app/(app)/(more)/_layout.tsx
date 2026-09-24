import { Stack } from 'expo-router';

import { useStackOptions } from '@/hooks/use-stack-options';

export const unstable_settings = { anchor: 'more' };

export default function MoreLayout() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="more" options={{ title: 'More', headerLargeTitle: true }} />
      <Stack.Screen name="domains" options={{ title: 'Domains' }} />
      <Stack.Screen name="domain/[id]" options={{ title: 'Domain' }} />
      <Stack.Screen name="mailboxes" options={{ title: 'Mailboxes' }} />
      <Stack.Screen name="mailbox-settings/[id]" options={{ title: 'Mailbox' }} />
      <Stack.Screen name="warmup" options={{ title: 'Warmup' }} />
      <Stack.Screen name="deliverability" options={{ title: 'Deliverability' }} />
      <Stack.Screen name="contacts" options={{ title: 'Contacts' }} />
      <Stack.Screen name="unsubscribes" options={{ title: 'Unsubscribes' }} />
      <Stack.Screen name="suppressions" options={{ title: 'Suppressions' }} />
      <Stack.Screen name="developer" options={{ title: 'Developer' }} />
      <Stack.Screen name="api-playground" options={{ title: 'API playground' }} />
      <Stack.Screen name="billing" options={{ title: 'Plan & billing' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="security" options={{ title: 'Security' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="affiliate" options={{ title: 'Affiliate program' }} />
      <Stack.Screen name="aws-accounts" options={{ title: 'AWS accounts' }} />
      <Stack.Screen name="support" options={{ title: 'Help & support' }} />
    </Stack>
  );
}
