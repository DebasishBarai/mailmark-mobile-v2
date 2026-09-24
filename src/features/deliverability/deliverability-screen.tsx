import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, Icon, ListSkeleton, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WebLinks } from '@/lib/config';
import { api } from '@/lib/convex/api';
import { useLiveQuery, useRefreshKey } from '@/lib/convex/hooks';
import type { DomainHealthSummary } from '@/lib/convex/types';
import { timeAgo } from '@/lib/format';

/**
 * Domain health: the scored checks the backend runs daily for each domain
 * (SPF, DKIM, DMARC, blocklists, bounce and complaint rates), as on the
 * website's Domain Health page.
 */
export function DeliverabilityScreen() {
  const { key, refreshing, refresh } = useRefreshKey();
  const health = useLiveQuery(api.domainHealth.latestForCurrentUser, {});

  if (health.status === 'loading') return <ListSkeleton avatar={false} rows={3} />;
  if (health.status === 'error') return <ErrorState error={health.error} onRetry={refresh} />;

  return (
    <Screen key={key} refreshing={refreshing} onRefresh={refresh}>
      <ThemedText type="body" themeColor="textSecondary">
        AWS suspends sending when bounces pass 5% or complaints pass 0.1%. Mailmark checks each domain daily and scores it out of 100.
      </ThemedText>
      {health.data.length === 0 ? (
        <EmptyState icon="heart" title="No domains yet" description="Add a domain to start tracking its reputation." actionLabel="Add a domain" onAction={() => router.push('/add-domain')} />
      ) : (
        health.data.map((h) => <HealthCard key={h.domainId} item={h} />)
      )}
      <Button title="Deliverability guide" variant="ghost" icon="docs" onPress={() => WebBrowser.openBrowserAsync(WebLinks.troubleshooting)} />
    </Screen>
  );
}

function HealthCard({ item }: { item: DomainHealthSummary }) {
  const theme = useTheme();
  const c = item.latestCheck;
  const tone = !c ? 'neutral' : c.reputationStatus === 'healthy' ? 'success' : c.reputationStatus === 'warning' ? 'warning' : 'danger';
  const color = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : tone === 'danger' ? theme.danger : theme.textMuted;

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <ThemedText type="subheading">{item.domainName}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {c ? `Checked ${timeAgo(c.checkedAt)}` : item.verified ? 'First check runs within a day' : 'Verify the domain to start checks'}
          </ThemedText>
        </View>
        {c ? (
          <View style={[styles.score, { borderColor: color }]}>
            <ThemedText type="heading" color={color}>
              {c.overallScore}
            </ThemedText>
          </View>
        ) : null}
      </View>
      {c ? (
        <>
          <Badge label={c.reputationStatus === 'healthy' ? 'Healthy' : c.reputationStatus === 'warning' ? 'Needs attention' : 'Critical'} tone={tone} />
          <View style={styles.checks}>
            <Check label="SPF" ok={c.spfValid} />
            <Check label="DKIM" ok={c.dkimValid} />
            <Check label="DMARC" ok={c.dmarcValid} />
            <Check label="Not blocklisted" ok={!c.blacklisted} />
          </View>
          <View style={styles.rates}>
            <Rate label="Bounce rate" value={c.bounceRate} limit={5} />
            <Rate label="Complaint rate" value={c.complaintRate} limit={0.1} />
          </View>
          {c.blacklistEntries?.length ? (
            <ThemedText type="small" themeColor="danger">
              Listed on: {c.blacklistEntries.join(', ')}
            </ThemedText>
          ) : null}
        </>
      ) : null}
      <Button title="Domain & DNS" variant="ghost" size="sm" onPress={() => router.push(`/domain/${item.domainId}`)} />
    </Card>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.check}>
      <Icon name={ok ? 'checkCircle' : 'warning'} size={14} color={ok ? theme.success : theme.danger} />
      <ThemedText type="small">{label}</ThemedText>
    </View>
  );
}

function Rate({ label, value, limit }: { label: string; value: number; limit: number }) {
  const theme = useTheme();
  const bad = value > limit;
  return (
    <View style={[styles.rate, { backgroundColor: bad ? theme.dangerSoft : theme.backgroundElement }]}>
      <ThemedText type="heading" themeColor={bad ? 'danger' : 'text'}>
        {value}%
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label} · limit {limit}%
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  score: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  rates: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rate: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
