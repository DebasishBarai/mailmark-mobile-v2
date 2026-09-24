import { useLocalSearchParams } from 'expo-router';

import { EmailScreen } from '@/features/mail/email-screen';

/**
 * mailmark://thread/{id}: a conversation, opened at the given message. The
 * reader shows the rest of the conversation beneath it.
 */
export default function ThreadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmailScreen id={id} />;
}
