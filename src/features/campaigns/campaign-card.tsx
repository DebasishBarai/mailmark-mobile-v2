import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Icon, ProgressBar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listDate, plural, timeUntil } from '@/lib/format';

import type { Campaign } from './campaign-index';
import { rate } from './stats';

export const CampaignCard = memo(function CampaignCard({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) {
  const theme = useTheme();
  const { stats } = campaign;
  const sent = stats.total - stats.scheduled;
  const problems = stats.bounced + stats.failed + stats.complained + stats.blocked;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Campaign ${campaign.subject}, ${plural(stats.total, 'recipient')}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.surfaceRaised, borderColor: theme.border },
      ]}>
      <View style={styles.top}>
        <ThemedText type="subheading" numberOfLines={2} style={styles.flex}>
          {campaign.subject || '(no subject)'}
        </ThemedText>
        {campaign.scheduled ? (
          <Badge label={`Sends ${timeUntil(campaign.at)}`} tone="info" icon="calendar" />
        ) : stats.pending > 0 ? (
          <Badge label="Sending" tone="warning" icon="pending" />
        ) : (
          <Badge label="Sent" tone="success" icon="check" />
        )}
      </View>
      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
        {campaign.mailboxAddress} · {listDate(campaign.at)} · {plural(stats.total, 'recipient')}
      </ThemedText>

      {sent > 0 ? (
        <>
          <View style={styles.metrics}>
            <Metric label="Delivered" value={`${rate(stats.delivered, sent)}%`} />
            <Metric label="Opened" value={`${rate(stats.opened, sent)}%`} />
            <Metric label="Clicked" value={`${rate(stats.clicked, sent)}%`} />
            <Metric label="Replied" value={`${rate(stats.replied, sent)}%`} accent />
          </View>
          <ProgressBar value={sent ? stats.opened / sent : 0} height={4} />
          {problems > 0 ? (
            <View style={styles.problem}>
              <Icon name="warning" size={12} color={theme.danger} />
              <ThemedText type="caption" themeColor="danger">
                {plural(problems, 'delivery problem')}
              </ThemedText>
            </View>
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
});

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.metric}>
      <ThemedText type="bodyStrong" themeColor={accent ? 'accent' : 'text'}>
        {value}
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
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  metric: {
    alignItems: 'flex-start',
  },
  problem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
