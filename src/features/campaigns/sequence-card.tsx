import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Sequence, SequenceStatus } from '@/lib/convex/types';
import { shortDate } from '@/lib/format';

export const SEQUENCE_STATUS: Record<SequenceStatus, { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  completed: { label: 'Completed', tone: 'neutral' },
};

export function followUpCount(sequence: Pick<Sequence, 'steps'>): number {
  return Math.max(0, sequence.steps.filter((s) => s.type === 'send_email').length - 1);
}

export const SequenceCard = memo(function SequenceCard({ sequence, onPress }: { sequence: Sequence; onPress: () => void }) {
  const theme = useTheme();
  const status = SEQUENCE_STATUS[sequence.status];
  const { stats } = sequence;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.surfaceRaised, borderColor: theme.border },
      ]}>
      <View style={styles.top}>
        <ThemedText type="subheading" numberOfLines={2} style={styles.flex}>
          {sequence.name}
        </ThemedText>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {sequence.mailboxAddress} · {followUpCount(sequence)} follow-ups · {shortDate(sequence.createdAt)}
      </ThemedText>
      <View style={styles.stats}>
        <Stat label="In progress" value={stats.active} />
        <Stat label="Replied" value={stats.replied} accent />
        <Stat label="Finished" value={stats.completed} />
        <Stat label="Bounced" value={stats.bounced} danger={stats.bounced > 0} />
      </View>
    </Pressable>
  );
});

function Stat({ label, value, accent, danger }: { label: string; value: number; accent?: boolean; danger?: boolean }) {
  return (
    <View>
      <ThemedText type="bodyStrong" themeColor={danger ? 'danger' : accent ? 'accent' : 'text'}>
        {value.toLocaleString()}
      </ThemedText>
      <ThemedText type="caption" themeColor="textMuted">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
});
