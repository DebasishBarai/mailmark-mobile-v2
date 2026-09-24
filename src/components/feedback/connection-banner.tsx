import { useConvexConnectionState } from 'convex/react';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** How long the socket must be down before saying so, to ride out blips. */
const GRACE_MS = 2500;

/**
 * Shown while the connection to Mailmark is down. Everything on screen stays
 * readable; changes made meanwhile are queued by the Convex client and sent
 * when the connection returns.
 */
export function ConnectionBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const state = useConvexConnectionState();
  const down = state.hasEverConnected && !state.isWebSocketConnected;
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    if (!down) return;
    const timer = setTimeout(() => setGraceOver(true), GRACE_MS);
    return () => {
      clearTimeout(timer);
      setGraceOver(false);
    };
  }, [down]);

  if (!down || !graceOver) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + Spacing.one }]}>
      <View
        accessibilityLiveRegion="polite"
        style={[styles.banner, { backgroundColor: theme.text }]}>
        <Icon name="wifiOff" size={14} color={theme.background} />
        <ThemedText type="smallStrong" color={theme.background}>
          Offline · changes will sync when you reconnect
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 900,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
