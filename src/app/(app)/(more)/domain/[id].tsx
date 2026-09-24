import { useLocalSearchParams } from 'expo-router';

import { DomainScreen } from '@/features/domains/domain-screen';

export default function DomainRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DomainScreen id={id} />;
}
