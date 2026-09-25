import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Email } from '@/lib/convex/types';

export type DeliveryState = 'scheduled' | 'pending' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed' | 'complained' | 'blocked';

/** The furthest thing that is known to have happened to a sent message. */
export function deliveryState(email: Email): DeliveryState | null {
  if (email.folder === 'outbox') return 'scheduled';
  if (email.deliveryStatus === 'bounced') return 'bounced';
  if (email.deliveryStatus === 'failed') return 'failed';
  if (email.deliveryStatus === 'blocked') return 'blocked';
  if (email.deliveryStatus === 'complained') return 'complained';
  if (email.repliedAt) return 'replied';
  if (email.clickedLinks && email.clickedLinks.length > 0) return 'clicked';
  if (email.openedAt) return 'opened';
  if (email.deliveryStatus === 'delivered') return 'delivered';
  if (email.deliveryStatus === 'pending') return 'pending';
  return null;
}

export const DELIVERY_META: Record<DeliveryState, { label: string; icon: IconName; tone: 'muted' | 'success' | 'accent' | 'danger' | 'warning' | 'info' }> = {
  scheduled: { label: 'Scheduled', icon: 'calendar', tone: 'info' },
  pending: { label: 'Sending', icon: 'pending', tone: 'muted' },
  delivered: { label: 'Delivered', icon: 'check', tone: 'success' },
  opened: { label: 'Opened', icon: 'eye', tone: 'success' },
  clicked: { label: 'Clicked', icon: 'cursor', tone: 'accent' },
  replied: { label: 'Replied', icon: 'reply', tone: 'accent' },
  bounced: { label: 'Bounced', icon: 'bounce', tone: 'danger' },
  failed: { label: 'Failed', icon: 'error', tone: 'danger' },
  complained: { label: 'Marked as spam', icon: 'warning', tone: 'danger' },
  blocked: { label: 'Not sent', icon: 'block', tone: 'warning' },
};

export function useToneColor() {
  const theme = useTheme();
  return (tone: (typeof DELIVERY_META)[DeliveryState]['tone']) =>
    ({
      muted: theme.textMuted,
      success: theme.success,
      accent: theme.accent,
      danger: theme.danger,
      warning: theme.warning,
      info: theme.info,
    })[tone];
}

export function DeliveryIndicator({ email, showLabel }: { email: Email; showLabel?: boolean }) {
  const state = deliveryState(email);
  const toneColor = useToneColor();
  if (!state) return null;
  const meta = DELIVERY_META[state];
  const color = toneColor(meta.tone);
  return (
    <View style={styles.row} accessibilityLabel={meta.label}>
      <Icon name={meta.icon} size={12} color={color} />
      {showLabel ? (
        <ThemedText type="caption" color={color}>
          {meta.label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
