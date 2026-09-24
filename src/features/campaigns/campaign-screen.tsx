import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState, Segmented } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DELIVERY_META, deliveryState, useToneColor } from '@/features/mail/delivery-status';
import { emailHref } from '@/features/mail/use-email';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import type { Email } from '@/lib/convex/types';
import { rawEmail } from '@/lib/email/address';
import { fullDate, listDate, plural } from '@/lib/format';

import { SEQUENCE_STATUS } from './sequence-card';
import { campaignStats, matchesFilter, rate, type RecipientFilter } from './stats';
import { useCampaignRecipients } from './use-campaign-recipients';
import { useSequences } from './use-sequences';

const FILTERS: { value: RecipientFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'replied', label: 'Replied' },
  { value: 'pending', label: 'Pending' },
  { value: 'problems', label: 'Problems' },
];

export function CampaignScreen({ batchId }: { batchId: string }) {
  const theme = useTheme();
  const recipients = useCampaignRecipients(batchId);
  const { mailboxes } = useWorkspace();
  const [filter, setFilter] = useState<RecipientFilter>('all');
  const sequences = useSequences();

  const emails = recipients.emails;
  const first = emails[0];
  const stats = useMemo(() => campaignStats(emails), [emails]);
  const mailbox = mailboxes.data?.find((m) => m._id === first?.mailboxId);
  const followUp = useMemo(
    () =>
      first
        ? sequences.data?.find((s) => s.mailboxId === first.mailboxId && s.name === `Follow-up: ${first.subject.slice(0, 50)}`)
        : undefined,
    [sequences.data, first],
  );
  const filtered = useMemo(
    () => emails.filter((e) => matchesFilter(e, filter)).sort((a, b) => a.to[0]?.localeCompare(b.to[0] ?? '') ?? 0),
    [emails, filter],
  );

  if (recipients.loading && emails.length === 0) return <LoadingState label="Loading campaign" />;
  if (recipients.error && emails.length === 0) return <ErrorState error={recipients.error} />;
  if (!first) {
    return (
      <EmptyState
        icon="campaign"
        title="Campaign not found"
        description="It may be older than the mail loaded on this device. Open Campaigns and load older campaigns, or view it on the website."
        actionLabel="Back to campaigns"
        onAction={() => router.back()}
      />
    );
  }

  const sent = stats.total - stats.scheduled;
  const scheduledAt = emails.find((e) => e.folder === 'outbox')?.scheduledAt;

  const header = (
    <View style={styles.headerContent}>
      <Stack.Screen options={{ title: 'Campaign' }} />
      <View style={styles.titleBlock}>
        <ThemedText type="title">{first.subject || '(no subject)'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          From {mailbox?.fullAddress ?? 'your mailbox'} · {plural(stats.total, 'recipient')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {stats.scheduled > 0 && scheduledAt ? `Scheduled for ${fullDate(scheduledAt)}` : `Sent ${fullDate(Math.min(...emails.map((e) => e.date)))}`}
        </ThemedText>
      </View>

      <View style={styles.grid}>
        <StatTile label="Delivered" value={stats.delivered} total={sent} color={theme.success} icon="check" />
        <StatTile label="Opened" value={stats.opened} total={sent} color={theme.info} icon="eye" />
        <StatTile label="Clicked" value={stats.clicked} total={sent} color={theme.accent} icon="cursor" />
        <StatTile label="Replied" value={stats.replied} total={sent} color={theme.accent} icon="reply" />
        <StatTile label="Bounced" value={stats.bounced + stats.failed} total={sent} color={theme.danger} icon="bounce" />
        <StatTile label={stats.scheduled ? 'Scheduled' : 'Pending'} value={stats.scheduled || stats.pending} total={stats.total} color={theme.textMuted} icon="pending" />
      </View>

      {sent > 0 ? <Funnel sent={sent} delivered={stats.delivered} opened={stats.opened} clicked={stats.clicked} replied={stats.replied} /> : null}

      {stats.complained + stats.blocked > 0 ? (
        <Card style={{ backgroundColor: theme.warningSoft, borderColor: theme.warningSoft }}>
          <ThemedText type="small" themeColor="warning">
            {stats.blocked > 0 ? `${plural(stats.blocked, 'recipient')} not sent (suppressed, unsubscribed or failed verification). ` : ''}
            {stats.complained > 0 ? `${plural(stats.complained, 'recipient')} marked this as spam.` : ''}
          </ThemedText>
        </Card>
      ) : null}

      {followUp ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/sequence/${followUp._id}`)}
          style={({ pressed }) => [styles.followUp, { backgroundColor: pressed ? theme.backgroundSelected : theme.surfaceRaised, borderColor: theme.border }]}>
          <Icon name="sequence" size={18} color={theme.accent} />
          <View style={styles.flex}>
            <ThemedText type="bodyStrong">Follow-up sequence</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {followUp.stats.active} in progress · {followUp.stats.replied} replied · {followUp.stats.completed} finished
            </ThemedText>
          </View>
          <Badge label={SEQUENCE_STATUS[followUp.status].label} tone={SEQUENCE_STATUS[followUp.status].tone} />
          <Icon name="chevronRight" size={14} color={theme.textMuted} />
        </Pressable>
      ) : null}

      {!recipients.complete ? (
        <ThemedText type="caption" themeColor="textMuted">
          Figures cover the {plural(emails.length, 'recipient')} found in the sent mail loaded so far. Load older campaigns on the Campaigns screen to include the rest of a very large send.
        </ThemedText>
      ) : null}

      <Segmented scrollable value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: emails.filter((e) => matchesFilter(e, f.value)).length }))} />
    </View>
  );

  return (
    <FlatList<Email>
      data={filtered}
      keyExtractor={(e) => e._id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      renderItem={({ item }) => <RecipientRow email={item} />}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
      ListEmptyComponent={<ThemedText type="small" themeColor="textMuted" style={styles.empty}>No recipients in this view.</ThemedText>}
      ListFooterComponent={<View style={styles.footer}><Button title="Open Sent in Mail" variant="ghost" icon="send" onPress={() => router.push({ pathname: '/mailbox/[id]', params: { id: first.mailboxId, folder: 'sent' } })} /></View>}
    />
  );
}

function StatTile({ label, value, total, color, icon }: { label: string; value: number; total: number; color: string; icon: 'check' | 'eye' | 'cursor' | 'reply' | 'bounce' | 'pending' }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]} accessibilityLabel={`${label}: ${value}, ${rate(value, total)} percent`}>
      <View style={styles.tileTop}>
        <Icon name={icon} size={14} color={color} />
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      <ThemedText type="heading">{value.toLocaleString()}</ThemedText>
      <ThemedText type="caption" themeColor="textMuted">
        {rate(value, total)}%
      </ThemedText>
    </View>
  );
}

function Funnel({ sent, delivered, opened, clicked, replied }: { sent: number; delivered: number; opened: number; clicked: number; replied: number }) {
  const theme = useTheme();
  const rows = [
    { label: 'Sent', value: sent, color: theme.textSecondary },
    { label: 'Delivered', value: delivered, color: theme.success },
    { label: 'Opened', value: opened, color: theme.info },
    { label: 'Clicked', value: clicked, color: theme.accent },
    { label: 'Replied', value: replied, color: theme.accent },
  ];
  return (
    <Card style={styles.funnel}>
      <ThemedText type="label" themeColor="textSecondary">
        Engagement
      </ThemedText>
      {rows.map((r) => (
        <View key={r.label} style={styles.funnelRow}>
          <ThemedText type="small" style={styles.funnelLabel}>
            {r.label}
          </ThemedText>
          <View style={[styles.funnelTrack, { backgroundColor: theme.backgroundElement }]}>
            <View style={{ width: `${sent ? (r.value / sent) * 100 : 0}%`, backgroundColor: r.color, height: '100%', borderRadius: 4 }} />
          </View>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.funnelValue}>
            {r.value.toLocaleString()}
          </ThemedText>
        </View>
      ))}
    </Card>
  );
}

function RecipientRow({ email }: { email: Email }) {
  const theme = useTheme();
  const toneColor = useToneColor();
  const state = deliveryState(email);
  const meta = state ? DELIVERY_META[state] : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(emailHref(email))}
      style={({ pressed }) => [styles.recipient, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <View style={styles.flex}>
        <ThemedText type="body" numberOfLines={1}>
          {email.to.map(rawEmail).join(', ')}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {listDate(email.repliedAt ?? email.openedAt ?? email.date)}
          {email.clickedLinks?.length ? ` · ${plural(email.clickedLinks.length, 'click')}` : ''}
        </ThemedText>
      </View>
      {meta ? (
        <View style={styles.status}>
          <Icon name={meta.icon} size={13} color={toneColor(meta.tone)} />
          <ThemedText type="caption" color={toneColor(meta.tone)}>
            {meta.label}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.eight,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  titleBlock: {
    gap: Spacing.one,
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
  funnel: {
    gap: Spacing.two,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  funnelLabel: {
    width: 72,
  },
  funnelTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  funnelValue: {
    width: 52,
    textAlign: 'right',
  },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  recipient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.five,
  },
  footer: {
    padding: Spacing.four,
  },
});
