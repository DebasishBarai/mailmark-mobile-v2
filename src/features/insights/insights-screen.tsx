import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { ThemedText } from '@/components/themed-text';
import { Badge, Card, ErrorState, Group, Icon, ListRow, ProgressBar, Screen, Skeleton, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { planName } from '@/features/billing/plans';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { useLiveQuery, useRefreshKey } from '@/lib/convex/hooks';
import type { EmailStats } from '@/lib/convex/types';
import { compact, percent } from '@/lib/format';

export function InsightsScreen() {
  const { key, refreshing, refresh } = useRefreshKey();
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <InsightsBody key={key} onRetry={refresh} />
    </Screen>
  );
}

function InsightsBody({ onRetry }: { onRetry: () => void }) {
  const theme = useTheme();
  const stats = useLiveQuery(api.emailStats.getForCurrentUser, {});
  const usage = useLiveQuery(api.quotas.getUsageAndLimits, {});
  const health = useLiveQuery(api.domainHealth.latestForCurrentUser, {});
  const unsubs = useLiveQuery(api.unsubscribes.getStats, {});
  const warmup = useLiveQuery(api.warmup.listForCurrentUser, {});

  if (stats.status === 'error') return <ErrorState error={stats.error} onRetry={onRetry} />;

  const s = stats.data;
  const activeWarmups = (warmup.data ?? []).filter((w) => w.status === 'active').length;

  return (
    <>
      {s ? <Headline stats={s} /> : <Skeleton height={120} />}

      {s ? (
        <View style={styles.grid}>
          <Tile icon="send" label="Sent" value={compact(s.totalSent)} />
          <Tile icon="check" label="Delivered" value={percent(s.delivered, s.totalSent)} sub={compact(s.delivered)} tone={theme.success} />
          <Tile icon="eye" label="Opened" value={percent(s.opened, s.totalSent)} sub={compact(s.opened)} tone={theme.info} />
          <Tile icon="bounce" label="Bounced" value={percent(s.bounced, s.totalSent)} sub={compact(s.bounced)} tone={s.bounced ? theme.danger : undefined} />
          <Tile icon="error" label="Failed" value={compact(s.failed)} tone={s.failed ? theme.danger : undefined} />
          <Tile icon="pending" label="Pending" value={compact(s.pending)} />
        </View>
      ) : null}

      {s ? (
        <Card style={styles.chartCard}>
          <ThemedText type="label" themeColor="textSecondary">
            Sent per day
          </ThemedText>
          <BarChart
            unit="sent"
            color={theme.chartSent}
            data={s.dailyVolume.map((d) => ({ key: d.date, label: d.label, value: d.sent }))}
          />
        </Card>
      ) : null}
      {s ? (
        <Card style={styles.chartCard}>
          <ThemedText type="label" themeColor="textSecondary">
            Received per day
          </ThemedText>
          <BarChart
            unit="received"
            color={theme.chartReceived}
            data={s.dailyVolume.map((d) => ({ key: d.date, label: d.label, value: d.received }))}
          />
        </Card>
      ) : null}

      {usage.data ? (
        <Group title={`Plan · ${planName(usage.data.plan)}`}>
          <UsageRow label="Emails this period" used={usage.data.usage.emailsSentThisPeriod} limit={usage.data.limits.emailsPerMonth} />
          <UsageRow label="Domains" used={usage.data.usage.domains} limit={usage.data.limits.domains} />
          <UsageRow label="Mailboxes" used={usage.data.usage.mailboxes} limit={usage.data.limits.mailboxes} />
          <UsageRow label="Recipients" used={usage.data.usage.recipients} limit={usage.data.limits.recipients} />
          <ListRow title="Plan & billing" icon="card" onPress={() => router.push('/billing')} />
        </Group>
      ) : null}

      <Group title="Deliverability">
        {(health.data ?? []).map((h) => {
          const c = h.latestCheck;
          const tone = !c ? 'neutral' : c.reputationStatus === 'healthy' ? 'success' : c.reputationStatus === 'warning' ? 'warning' : 'danger';
          return (
            <ListRow
              key={h.domainId}
              title={h.domainName}
              subtitle={c ? `Bounce ${c.bounceRate}% · complaints ${c.complaintRate}%${c.blacklisted ? ' · blocklisted' : ''}` : h.verified ? 'No health check yet' : 'Domain not verified'}
              icon="heart"
              right={c ? <Badge label={`${c.overallScore}/100`} tone={tone} /> : undefined}
              onPress={() => router.push('/deliverability')}
            />
          );
        })}
        {unsubs.data ? (
          <ListRow
            title="Unsubscribes"
            subtitle={`${unsubs.data.last7Days} this week · ${unsubs.data.last30Days} in 30 days`}
            value={compact(unsubs.data.total)}
            icon="unsubscribe"
            onPress={() => router.push('/unsubscribes')}
          />
        ) : null}
        <ListRow
          title="Warmup"
          subtitle={activeWarmups ? `${activeWarmups} mailbox${activeWarmups === 1 ? '' : 'es'} warming up` : 'Build sender reputation before a big send'}
          icon="flame"
          onPress={() => router.push('/warmup')}
        />
      </Group>
    </>
  );
}

function Headline({ stats }: { stats: EmailStats }) {
  const theme = useTheme();
  const last7 = stats.dailyVolume.slice(-7).reduce((a, d) => a + d.sent, 0);
  const prev7 = stats.dailyVolume.slice(-14, -7).reduce((a, d) => a + d.sent, 0);
  const change = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;
  return (
    <View style={[styles.headline, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
      <ThemedText type="label" themeColor="textSecondary">
        Last 7 days
      </ThemedText>
      <View style={styles.headlineRow}>
        <ThemedText type="display">{last7.toLocaleString()}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          sent
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {change === null ? 'No sends in the week before.' : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs the previous 7 days`} · {stats.deliveryRate}% delivered · {stats.openRate}% opened overall
      </ThemedText>
    </View>
  );
}

function Tile({ icon, label, value, sub, tone }: { icon: IconName; label: string; value: string; sub?: string; tone?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
      <View style={styles.tileTop}>
        <Icon name={icon} size={13} color={tone ?? theme.textSecondary} />
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      <ThemedText type="heading">{value}</ThemedText>
      {sub ? (
        <ThemedText type="caption" themeColor="textMuted">
          {sub}
        </ThemedText>
      ) : null}
    </View>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const theme = useTheme();
  const ratio = limit ? used / limit : 0;
  return (
    <View style={styles.usage}>
      <View style={styles.usageTop}>
        <ThemedText type="body" style={styles.flex}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {used.toLocaleString()} / {limit === null ? 'Unlimited' : limit.toLocaleString()}
        </ThemedText>
      </View>
      {limit !== null ? <ProgressBar value={ratio} color={ratio > 0.9 ? theme.danger : ratio > 0.75 ? theme.warning : theme.accent} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  chartCard: {
    gap: Spacing.two,
  },
  usage: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  usageTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
});
