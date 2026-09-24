import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session';
import { usePreferences } from '@/features/settings/preferences';
import { useTheme } from '@/hooks/use-theme';

/** Grace period so a quick app switch (e.g. to copy a code) does not re-lock. */
const RELOCK_AFTER_MS = 30_000;

/**
 * Optional app lock: when enabled in Security settings, the app is covered on
 * launch and after it has been in the background for a while, until the user
 * passes Face ID / Touch ID / fingerprint or the device passcode.
 */
export function AppLockGate() {
  const theme = useTheme();
  const { prefs, ready } = usePreferences();
  const { isAuthenticated } = useSession();
  const enabled = ready && prefs.appLock && isAuthenticated && process.env.EXPO_OS !== 'web';
  const [locked, setLocked] = useState(true);
  const backgroundedAt = useRef<number | null>(null);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Mailmark',
        disableDeviceFallback: false,
      });
      if (result.success) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active' && backgroundedAt.current) {
        if (Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) setLocked(true);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled]);

  useEffect(() => {
    if (enabled && locked) void unlock();
  }, [enabled, locked, unlock]);

  if (!enabled || !locked) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: theme.background }]}>
      <LogoMark size={56} />
      <ThemedText type="heading">Mailmark is locked</ThemedText>
      <Button title="Unlock" icon="faceId" onPress={unlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    zIndex: 1000,
  },
});
