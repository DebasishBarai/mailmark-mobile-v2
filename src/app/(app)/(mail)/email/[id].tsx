import { useLocalSearchParams } from 'expo-router';

import { EmailScreen } from '@/features/mail/email-screen';

export default function EmailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmailScreen id={id} />;
}
