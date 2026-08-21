import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  /** `raised` lifts the card off the page; `flat` sits level with it. */
  tone?: 'raised' | 'flat';
  padded?: boolean;
};

export function Card({ style, tone = 'raised', padded = true, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tone === 'raised' ? theme.surfaceRaised : theme.surface,
          borderColor: theme.border,
        },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  padded: {
    padding: Spacing.four,
  },
});
