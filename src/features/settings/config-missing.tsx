import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shown instead of the app when the build was made without the environment
 * that points it at a Mailmark backend. A developer-facing screen: a store
 * build always has these set.
 */
export function ConfigMissingScreen({ missing }: { missing: string[] }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.seven }]}>
      <LogoMark size={48} />
      <ThemedText type="title">Connect this build to Mailmark</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        The app talks to the same Convex deployment and Clerk instance as the website. Add these to a
        .env.local file (see .env.example) and restart the bundler. EAS builds don&apos;t read
        .env.local: set them with `eas env:create` and rebuild.
      </ThemedText>
      <Card>
        <View style={styles.list}>
          {missing.map((name) => (
            <ThemedText key={name} type="mono">
              {name}
            </ThemedText>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.five,
    gap: Spacing.four,
  },
  list: {
    gap: Spacing.two,
  },
});
