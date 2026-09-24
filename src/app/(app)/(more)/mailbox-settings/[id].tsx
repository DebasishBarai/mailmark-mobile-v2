import { useLocalSearchParams } from 'expo-router';

import { MailboxSettingsScreen } from '@/features/mailboxes/mailbox-settings-screen';

export default function MailboxSettingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MailboxSettingsScreen id={id} />;
}
