import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { CTA } from '@/constants/content';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function CtaBlock({ onPress }: { onPress: () => void }) {
  const theme = useTheme();

  return (
    <View style={[styles.block, { backgroundColor: theme.accent }]}>
      <ThemedText type="displaySmall" color={theme.accentText}>
        {CTA.title}
      </ThemedText>
      <ThemedText type="small" color={theme.accentText} style={styles.body}>
        {CTA.body}
      </ThemedText>
      <Button
        title={CTA.action}
        variant="secondary"
        iconAfter="arrowRight"
        onPress={onPress}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.three,
    padding: Spacing.five,
    borderRadius: Radius.xl,
    marginTop: Spacing.seven,
  },
  body: {
    opacity: 0.9,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
