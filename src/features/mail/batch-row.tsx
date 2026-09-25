import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Email } from '@/lib/convex/types';
import { listDate, timeUntil } from '@/lib/format';

export type BatchRowProps = {
  batchId: string;
  emails: Email[];
  onPress: (batchId: string) => void;
};

/**
 * A campaign send in Sent or Outbox: one row for the whole batch with its
 * delivery tallies, as the website groups multi-recipient sends by batchId.
 */
export const BatchRow = memo(function BatchRow({ batchId, emails, onPress }: BatchRowProps) {
  const theme = useTheme();
  const rep = emails[0];
  const pending = emails.filter((e) => e.deliveryStatus === 'pending').length;
  const opened = emails.filter((e) => !!e.openedAt).length;
  const delivered = emails.filter((e) => e.deliveryStatus === 'delivered').length;
  const failed = emails.filter((e) => e.deliveryStatus === 'bounced' || e.deliveryStatus === 'failed').length;
  const scheduled = rep.folder === 'outbox' && rep.scheduledAt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Campaign to ${emails.length} recipients: ${rep.subject}`}
      onPress={() => onPress(batchId)}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.backgroundSelected : theme.background }]}>
      <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
        <Icon name="campaign" size={18} color={theme.accent} />
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <ThemedText type="bodyStrong" numberOfLines={1} style={styles.flex}>
            Campaign · {emails.length} recipients
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {scheduled ? timeUntil(rep.scheduledAt!) : listDate(rep.date)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {rep.subject || '(no subject)'}
        </ThemedText>
        <View style={styles.tallies}>
          {pending > 0 ? <Tally icon="pending" color={theme.textMuted} value={pending} label="sending" /> : null}
          {delivered > 0 ? <Tally icon="check" color={theme.success} value={delivered} label="delivered" /> : null}
          {opened > 0 ? <Tally icon="doubleCheck" color={theme.success} value={opened} label="opened" /> : null}
          {failed > 0 ? <Tally icon="bounce" color={theme.danger} value={failed} label="bounced" /> : null}
        </View>
      </View>
      <Icon name="chevronRight" size={14} color={theme.textMuted} />
    </Pressable>
  );
});

function Tally({ icon, color, value, label }: { icon: 'pending' | 'check' | 'doubleCheck' | 'bounce'; color: string; value: number; label: string }) {
  return (
    <View style={styles.tally} accessibilityLabel={`${value} ${label}`}>
      <Icon name={icon} size={11} color={color} />
      <ThemedText type="caption" color={color}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  tallies: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: 2,
  },
  tally: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
