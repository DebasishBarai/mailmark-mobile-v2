import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WebLinks } from '@/lib/config';

/**
 * Shown when the session has not resolved after several seconds, which
 * means the sign-in service or Mailmark cannot be reached (no connection,
 * captive portal, a network that blocks it). Loading continues underneath:
 * the app moves on by itself as soon as the connection works.
 */
export function ConnectingScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]} accessibilityLiveRegion="polite">
      <LogoMark size={48} />
      <ActivityIndicator color={theme.accent} />
      <ThemedText type="subheading" style={styles.center}>
        Still connecting to Mailmark
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Check your internet connection. Mailmark will continue as soon as it can reach the server.
      </ThemedText>
      <Button title="Service status" variant="ghost" icon="external" onPress={() => WebBrowser.openBrowserAsync(WebLinks.status)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.six,
  },
  center: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
