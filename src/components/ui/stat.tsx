import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StatProps = {
  value: string;
  label: string;
  tone?: 'default' | 'accent';
};

export function Stat({ value, label, tone = 'default' }: StatProps) {
  const theme = useTheme();

  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ThemedText
        type="heading"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        themeColor={tone === 'accent' ? 'accent' : 'text'}>
        {value}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
