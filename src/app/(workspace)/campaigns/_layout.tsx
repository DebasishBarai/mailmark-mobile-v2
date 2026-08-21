import { Stack } from 'expo-router';

import { useStackOptions } from '@/hooks/use-stack-options';

export default function SectionLayout() {
  return <Stack screenOptions={useStackOptions()} />;
}
