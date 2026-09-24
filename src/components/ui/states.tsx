import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { Button } from './button';
import { Icon, type IconName } from './icon';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, isNetworkError } from '@/lib/convex/errors';

export function LoadingState({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator color={theme.accent} />
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

export type ErrorStateProps = {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorState({ error, title, onRetry, compact }: ErrorStateProps) {
  const theme = useTheme();
  const offline = isNetworkError(error);
  return (
    <View style={[styles.center, compact && styles.compact]}>
      <Icon name={offline ? 'wifiOff' : 'warning'} size={26} color={offline ? theme.textMuted : theme.warning} />
      <ThemedText type="subheading" style={styles.centerText}>
        {title ?? (offline ? 'You appear to be offline' : 'Could not load this')}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        {offline
          ? 'Mailmark will reconnect automatically when your connection returns.'
          : errorMessage(error, 'Something went wrong while talking to Mailmark.')}
      </ThemedText>
      {onRetry ? <Button title="Try again" variant="secondary" size="sm" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
        <Icon name={icon} size={26} color={theme.textSecondary} />
      </View>
      <ThemedText type="subheading" style={styles.centerText}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          {description}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} size="sm" onPress={onAction} /> : null}
    </View>
  );
}

/** A pulsing placeholder block. */
export function Skeleton({ width, height = 12, style }: { width?: ViewStyle['width']; height?: number; style?: ViewStyle }) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: Radius.sm, backgroundColor: theme.backgroundSelected, opacity },
        style,
      ]}
    />
  );
}

/** Placeholder rows shaped like a message list. */
export function ListSkeleton({ rows = 8, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <View accessibilityLabel="Loading" style={styles.skeletonList}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          {avatar ? <Skeleton width={40} height={40} style={{ borderRadius: Radius.md }} /> : null}
          <View style={styles.skeletonText}>
            <Skeleton width="45%" height={13} />
            <Skeleton width="80%" height={11} />
            <Skeleton width="65%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.seven,
    paddingHorizontal: Spacing.five,
  },
  compact: {
    flex: 0,
    paddingVertical: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
    maxWidth: 340,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  skeletonList: {
    paddingTop: Spacing.two,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  skeletonText: {
    flex: 1,
    gap: Spacing.two,
  },
});
