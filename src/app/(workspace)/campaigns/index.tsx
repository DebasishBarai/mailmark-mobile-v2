import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card, EmptyState, Icon, ProgressBar, Screen, Segmented, Stat } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { CampaignStatus } from '@/data/types';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/campaign';
import { formatNumber, formatPercent, formatRelative } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

const FILTERS: { value: CampaignStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'sending', label: 'Sending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
  { value: 'draft', label: 'Drafts' },
];

export default function CampaignsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { campaigns, mailboxes } = useWorkspace();
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all');

  const totals = useMemo(
    () =>
      campaigns.reduce(
        (accumulator, campaign) => ({
          sent: accumulator.sent + campaign.sent,
          opened: accumulator.opened + campaign.opened,
          clicked: accumulator.clicked + campaign.clicked,
          replied: accumulator.replied + campaign.replied,
        }),
        { sent: 0, opened: 0, clicked: 0, replied: 0 },
      ),
    [campaigns],
  );

  const visible = campaigns.filter((campaign) => filter === 'all' || campaign.status === filter);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Campaigns',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New campaign"
              hitSlop={10}
              onPress={() => router.push('/new-campaign')}>
              <Icon name="add" size={22} color={theme.accent} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.statsRow}>
        <Stat value={formatNumber(totals.sent)} label="Sent" />
        <Stat value={formatPercent(totals.opened, totals.sent)} label="Opened" tone="accent" />
        <Stat value={formatPercent(totals.clicked, totals.sent)} label="Clicked" />
        <Stat value={formatNumber(totals.replied)} label="Replies" />
      </View>

      <View style={styles.filter}>
        <Segmented options={FILTERS} value={filter} onChange={setFilter} scrollable />
      </View>

      {visible.length === 0 ? (
        <EmptyState
          icon="campaign"
          title="No campaigns here"
          description="Pick a mailbox, drop in your user list, personalize with merge tags, and send."
        />
      ) : (
        <View style={styles.list}>
          {visible.map((campaign) => {
            const mailbox = mailboxes.find((item) => item.id === campaign.mailboxId);
            const progress = campaign.recipients ? campaign.sent / campaign.recipients : 0;

            return (
              <Pressable
                key={campaign.id}
                accessibilityRole="button"
                onPress={() => router.push(`/campaigns/${campaign.id}`)}>
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <ThemedText type="subheading" style={styles.cardTitle} numberOfLines={1}>
                      {campaign.name}
                    </ThemedText>
                    <Badge label={STATUS_LABEL[campaign.status]} tone={STATUS_TONE[campaign.status]} />
                  </View>

                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {campaign.subject}
                  </ThemedText>

                  <View style={styles.metaRow}>
                    <Icon name="send" size={12} color={theme.textMuted} />
                    <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
                      {mailbox?.address ?? 'No mailbox'} · {formatRelative(campaign.date)}
                    </ThemedText>
                  </View>

                  {campaign.recipients > 0 ? (
                    <>
                      <ProgressBar value={progress} />
                      <View style={styles.inlineStats}>
                        <InlineStat label="Sent" value={formatNumber(campaign.sent)} />
                        <InlineStat label="Opens" value={formatPercent(campaign.opened, campaign.sent)} />
                        <InlineStat label="Clicks" value={formatPercent(campaign.clicked, campaign.sent)} />
                        <InlineStat label="Replies" value={formatNumber(campaign.replied)} />
                      </View>
                    </>
                  ) : null}
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.inlineStat}>
      <ThemedText type="smallStrong">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textMuted">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  filter: {
    paddingVertical: Spacing.four,
  },
  list: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  inlineStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.one,
  },
  inlineStat: {
    alignItems: 'flex-start',
  },
});
