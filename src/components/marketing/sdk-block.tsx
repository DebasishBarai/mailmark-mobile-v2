import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon } from '@/components/ui';
import { SDK_BULLETS, SDK_SNIPPET } from '@/constants/content';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SdkBlock({ onOpenDocs }: { onOpenDocs: () => void }) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.install, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ThemedText type="mono" themeColor="accent">
          $
        </ThemedText>
        <ThemedText type="mono" selectable>
          bun add mailmark-sdk
        </ThemedText>
      </View>

      <View style={styles.bullets}>
        {SDK_BULLETS.map((bullet) => (
          <View key={bullet} style={styles.bullet}>
            <Icon name="checkCircle" size={14} color={theme.success} />
            <ThemedText type="small" style={styles.bulletText}>
              {bullet}
            </ThemedText>
          </View>
        ))}
      </View>

      <Card padded={false} style={styles.code}>
        <View style={[styles.codeHeader, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
          <Icon name="code" size={13} color={theme.textSecondary} />
          <ThemedText type="caption" themeColor="textSecondary">
            mailmark-sdk
          </ThemedText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ThemedText type="monoSmall" selectable style={styles.codeBody}>
            {SDK_SNIPPET}
          </ThemedText>
        </ScrollView>
      </Card>

      <Button
        title="Read the API docs"
        variant="secondary"
        iconAfter="external"
        onPress={onOpenDocs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.four,
  },
  install: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bullets: {
    gap: Spacing.two,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bulletText: {
    flex: 1,
  },
  code: {
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  codeBody: {
    padding: Spacing.four,
  },
});
