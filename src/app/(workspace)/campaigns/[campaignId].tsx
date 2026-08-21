import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card, Divider, EmptyState, Icon, ProgressBar, Screen, Stat } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { STATUS_LABEL, STATUS_TONE } from '@/lib/campaign';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

export default function CampaignScreen() {
  const theme = useTheme();
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const { campaigns, mailboxes, domains } = useWorkspace();

  const campaign = campaigns.find((item) => item.id === campaignId);
  const mailbox = mailboxes.find((item) => item.id === campaign?.mailboxId);
  const domain = domains.find((item) => item.id === mailbox?.domainId);

  if (!campaign) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ title: 'Campaign' }} />
        <EmptyState icon="campaign" title="Campaign not found" />
      </Screen>
    );
  }

  const delivered = Math.max(0, campaign.sent - campaign.bounced);

  return (
    <Screen>
      <Stack.Screen options={{ title: campaign.name }} />

      <View style={styles.header}>
        <Badge label={STATUS_LABEL[campaign.status]} tone={STATUS_TONE[campaign.status]} />
        <ThemedText type="title">{campaign.name}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          {campaign.subject}
        </ThemedText>
        <View style={styles.metaRow}>
          <Icon name="send" size={13} color={theme.textMuted} />
          <ThemedText type="small" themeColor="textMuted">
            From {mailbox?.address ?? 'unknown'} · {formatDateTime(campaign.date)}
          </ThemedText>
        </View>
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <ThemedText type="smallStrong">
            {formatNumber(campaign.sent)} of {formatNumber(campaign.recipients)} sent
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {formatPercent(campaign.sent, campaign.recipients)}
          </ThemedText>
        </View>
        <ProgressBar value={campaign.recipients ? campaign.sent / campaign.recipients : 0} />
        <ThemedText type="caption" themeColor="textMuted">
          Each recipient gets their own email, so the To field never shows your list.
        </ThemedText>
      </Card>

      <View style={styles.statsGrid}>
        <Stat value={formatNumber(campaign.sent)} label="Sent" />
        <Stat value={formatNumber(campaign.opened)} label="Opened" tone="accent" />
        <Stat value={formatNumber(campaign.clicked)} label="Clicked" />
        <Stat value={formatNumber(campaign.replied)} label="Replied" />
      </View>

      <Card style={styles.rates}>
        <ThemedText type="label" themeColor="textSecondary">
          Rates
        </ThemedText>
        <RateRow label="Open rate" value={formatPercent(campaign.opened, delivered)} />
        <RateRow label="Click rate" value={formatPercent(campaign.clicked, delivered)} />
        <RateRow label="Reply rate" value={formatPercent(campaign.replied, delivered)} />
        <RateRow label="Bounced" value={formatNumber(campaign.bounced)} tone="danger" />
        <RateRow label="Unsubscribed" value={formatNumber(campaign.unsubscribed)} />
      </Card>

      <Card style={styles.sequence}>
        <ThemedText type="label" themeColor="textSecondary">
          Follow-up sequence
        </ThemedText>
        {campaign.stages.map((stage, index) => (
          <View key={stage.stage}>
            {index > 0 ? <Divider style={styles.stageDivider} /> : null}
            <View style={styles.stageRow}>
              <Icon
                name={stage.sent ? 'checkCircle' : 'pending'}
                size={16}
                color={stage.sent ? theme.success : theme.textMuted}
              />
              <View style={styles.stageText}>
                <ThemedText type="smallStrong">
                  Stage {stage.stage} · {stage.label}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {stage.delayDays === 0
                    ? 'Sends immediately'
                    : `Sends ${stage.delayDays} days later, to recipients who have not replied`}
                </ThemedText>
              </View>
            </View>
          </View>
        ))}
      </Card>

      {domain ? (
        <Card style={styles.deliverability}>
          <ThemedText type="label" themeColor="textSecondary">
            Deliverability
          </ThemedText>
          <ThemedText type="small">
            Sending on {domain.domain} · reputation {domain.reputation}/100
          </ThemedText>
          {domain.warmingDay ? (
            <ThemedText type="caption" themeColor="warning">
              Inbox warming, day {domain.warmingDay} of 28 — volume is ramping automatically.
            </ThemedText>
          ) : (
            <ThemedText type="caption" themeColor="success">
              Warm-up complete. SPF, DKIM and DMARC monitored continuously.
            </ThemedText>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}

function RateRow({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <View style={styles.rateRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="mono" themeColor={tone === 'danger' ? 'danger' : 'text'}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  progressCard: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  rates: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sequence: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  stageText: {
    flex: 1,
    gap: 1,
  },
  stageDivider: {
    marginVertical: Spacing.three,
  },
  deliverability: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
