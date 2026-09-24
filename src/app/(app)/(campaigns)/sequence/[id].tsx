import { useLocalSearchParams } from 'expo-router';

import { SequenceScreen } from '@/features/campaigns/sequence-screen';

export default function SequenceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SequenceScreen id={id} />;
}
