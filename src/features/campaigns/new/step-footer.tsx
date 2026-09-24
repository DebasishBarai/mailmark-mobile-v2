import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The fixed bottom bar of each New campaign step: context on the left, the next step on the right. */
export function StepFooter({ hint, title, disabled, loading, onPress }: { hint?: string; title: string; disabled?: boolean; loading?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.hint} numberOfLines={2}>
        {hint}
      </ThemedText>
      <Button title={title} iconAfter="arrowRight" disabled={disabled} loading={loading} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    flex: 1,
  },
});
