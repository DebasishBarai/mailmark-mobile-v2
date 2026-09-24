import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

/** Monospace code with a copy button. Long lines wrap rather than scroll sideways. */
export function CodeBlock({ code, maxHeight }: { code: string; maxHeight?: number }) {
  const theme = useTheme();
  const toast = useToast();
  return (
    <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ScrollView style={maxHeight ? { maxHeight } : undefined} nestedScrollEnabled>
        <ThemedText type="monoSmall" selectable style={styles.code}>
          {code}
        </ThemedText>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Copy code"
        hitSlop={8}
        onPress={async () => {
          await Clipboard.setStringAsync(code);
          haptic('light');
          toast.show({ message: 'Copied', icon: 'copy' });
        }}
        style={[styles.copy, { backgroundColor: theme.surfaceRaised }]}>
        <Icon name="copy" size={14} color={theme.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    paddingRight: 44,
  },
  code: {
    lineHeight: 17,
  },
  copy: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
