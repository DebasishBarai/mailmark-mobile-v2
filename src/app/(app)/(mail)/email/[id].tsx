import { useLocalSearchParams } from 'expo-router';

import { EmailScreen } from '@/features/mail/email-screen';

export default function EmailRoute() {
  const { id, mailbox, folder } = useLocalSearchParams<{ id: string; mailbox?: string; folder?: string }>();
  return <EmailScreen id={id} location={{ mailboxId: mailbox, folder }} />;
}
