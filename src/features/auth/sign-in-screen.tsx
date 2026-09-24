import { useSSO } from '@clerk/expo';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button, Icon, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session';
import { useTheme } from '@/hooks/use-theme';
import { WebLinks } from '@/lib/config';
import { errorMessage } from '@/lib/convex/errors';
import { haptic } from '@/lib/haptics';

// Completes a pending auth session when the browser redirects back to the app.
WebBrowser.maybeCompleteAuthSession();

type Busy = 'sign-in' | 'sign-up' | 'google' | null;

const HIGHLIGHTS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'inbox', title: 'Every mailbox, one inbox', body: 'Read, reply and triage mail for all your domains.' },
  { icon: 'campaign', title: 'Campaigns on the go', body: 'Launch personalised sends with follow-ups and track replies.' },
  { icon: 'bell', title: 'Know the moment it matters', body: 'Replies, bounces and delivery problems as notifications.' },
];

/**
 * Sign-in uses the same Clerk instance as mailmark.dev, so every account and
 * sign-in method that works on the website works here. Email and password,
 * codes and MFA run in Clerk's hosted Account Portal inside a system auth
 * session (ASWebAuthenticationSession / Custom Tabs), which shares the OS
 * password manager and passkeys and never exposes credentials to the app.
 */
export function SignInScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { expired } = useSession();
  const { startHostedAuth } = useHostedAuth();
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setError(null);
    haptic('light');
    try {
      if (kind === 'google') {
        const { createdSessionId, setActive } = await startSSOFlow({ strategy: 'oauth_google' });
        if (createdSessionId && setActive) await setActive({ session: createdSessionId });
      } else {
        await startHostedAuth({ mode: kind });
      }
    } catch (err) {
      haptic('error');
      setError(
        kind === 'google'
          ? `${errorMessage(err, 'Google sign-in did not complete.')} You can also use Sign in.`
          : errorMessage(err, 'Sign-in did not complete. Please try again.'),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + Spacing.seven, paddingBottom: insets.bottom + Spacing.five },
      ]}>
      <View style={styles.brand}>
        <LogoMark size={56} />
        <ThemedText type="display" style={styles.center}>
          Mailmark
        </ThemedText>
        <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
          Email for your domains, built for your pocket.
        </ThemedText>
      </View>

      {expired ? (
        <View style={[styles.notice, { backgroundColor: theme.warningSoft }]}>
          <Icon name="lock" size={16} color={theme.warning} />
          <ThemedText type="small" color={theme.warning} style={styles.flex}>
            Your session ended. Sign in again to pick up where you left off.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.highlights}>
        {HIGHLIGHTS.map((item) => (
          <View key={item.title} style={styles.highlight}>
            <View style={[styles.highlightIcon, { backgroundColor: theme.accentSoft }]}>
              <Icon name={item.icon} size={18} color={theme.accent} />
            </View>
            <View style={styles.flex}>
              <ThemedText type="bodyStrong">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.body}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {error ? (
          <View style={[styles.notice, { backgroundColor: theme.dangerSoft }]} accessibilityLiveRegion="polite">
            <Icon name="warning" size={16} color={theme.danger} />
            <ThemedText type="small" color={theme.danger} style={styles.flex}>
              {error}
            </ThemedText>
          </View>
        ) : null}
        <Button
          title="Sign in"
          size="lg"
          fullWidth
          loading={busy === 'sign-in'}
          disabled={busy !== null && busy !== 'sign-in'}
          onPress={() => run('sign-in')}
        />
        <Button
          title="Continue with Google"
          variant="secondary"
          size="lg"
          fullWidth
          loading={busy === 'google'}
          disabled={busy !== null && busy !== 'google'}
          onPress={() => run('google')}
        />
        <Button
          title="Create an account"
          variant="ghost"
          fullWidth
          loading={busy === 'sign-up'}
          disabled={busy !== null && busy !== 'sign-up'}
          onPress={() => run('sign-up')}
        />
        <ThemedText type="caption" themeColor="textMuted" style={styles.center}>
          By continuing you agree to the Terms ({WebLinks.terms.replace(/^https?:\/\//, '')}) and Privacy Policy.
          {Platform.OS === 'ios' ? ' Passwords and passkeys from iCloud Keychain work here.' : ''}
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
    gap: Spacing.six,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  highlights: {
    gap: Spacing.four,
  },
  highlight: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: Spacing.three,
    marginTop: 'auto',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  flex: {
    flex: 1,
  },
});
