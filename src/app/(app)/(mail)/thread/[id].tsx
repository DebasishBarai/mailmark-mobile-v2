import { useLocalSearchParams } from 'expo-router';

import { EmailScreen } from '@/features/mail/email-screen';

/**
 * mailmark://thread/{id}: a conversation, opened at the given message. The
 * reader shows the rest of the conversation beneath it.
 */
export default function ThreadRoute() {
  const { id, mailbox, folder } = useLocalSearchParams<{ id: string; mailbox?: string; folder?: string }>();
  return <EmailScreen id={id} location={{ mailboxId: mailbox, folder }} />;
}
