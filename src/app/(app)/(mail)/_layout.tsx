import { Stack } from 'expo-router';

import { useStackOptions } from '@/hooks/use-stack-options';

export const unstable_settings = { anchor: 'index' };

export default function MailLayout() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Inbox' }} />
      <Stack.Screen name="email/[id]" options={{ title: '' }} />
      <Stack.Screen name="thread/[id]" options={{ title: 'Conversation' }} />
      <Stack.Screen name="mailbox/[id]" options={{ title: '' }} />
    </Stack>
  );
}
