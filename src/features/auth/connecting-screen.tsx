import { useClerk } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WebLinks } from '@/lib/config';

/**
 * Clerk's load status. "error" means Clerk reached its server and was
 * refused (for example the instance has the Native API turned off), which no
 * amount of waiting fixes, unlike a slow or missing connection.
 */
export function useClerkFailed() {
  const clerk = useClerk();
  const [status, setStatus] = useState(clerk.status);

  useEffect(() => {
    clerk.on('status', setStatus, { notify: true });
    return () => clerk.off('status', setStatus);
  }, [clerk]);

  return status === 'error';
}

/**
 * Shown when the session has not resolved after several seconds, which
 * means the sign-in service or Mailmark cannot be reached (no connection,
 * captive portal, a network that blocks it). Loading continues underneath:
 * the app moves on by itself as soon as the connection works. If Clerk
 * failed outright, says so instead of blaming the connection.
 */
export function ConnectingScreen() {
  const theme = useTheme();
  const failed = useClerkFailed();
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]} accessibilityLiveRegion="polite">
      <LogoMark size={48} />
      {failed ? null : <ActivityIndicator color={theme.accent} />}
      <ThemedText type="subheading" style={styles.center}>
        {failed ? 'Sign-in is unavailable' : 'Still connecting to Mailmark'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {failed
          ? "Mailmark's sign-in service didn't accept this app. This isn't your connection; please try again later."
          : 'Check your internet connection. Mailmark will continue as soon as it can reach the server.'}
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
