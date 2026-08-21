import { useMemo } from 'react';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Native stack headers, painted with the Mailmark palette and type. */
export function useStackOptions() {
  const theme = useTheme();

  return useMemo(
    () => ({
      headerTintColor: theme.accent,
      headerStyle: { backgroundColor: theme.background },
      headerTitleStyle: { fontFamily: Fonts.sansBold, color: theme.text },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: theme.background },
    }),
    [theme],
  );
}
