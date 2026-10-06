import { useConvex } from 'convex/react';
import type { PaginationResult } from 'convex/server';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/feedback/toast';
import { Badge, Button, Card, EmptyState, ErrorState, Icon, IconButton, LoadingState, Segmented } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DELIVERY_META, deliveryState, useToneColor } from '@/features/mail/delivery-status';
import { emailHref } from '@/features/mail/use-email';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import type { Email, SequenceEnrollment } from '@/lib/convex/types';
import { rawEmail } from '@/lib/email/address';
import { fullDate, plural } from '@/lib/format';

import { campaignCsv, matchFollowUp, recipientStatus } from './history';
import { setCampaignHandoff } from './new/handoff';
import { notOpenedEmails, recallCampaignMessage, recipientColumns, sendAgainRecipients, splitSignature } from './send-again';
import { shareCampaignCsv } from './share-csv';
import { SEQUENCE_STATUS } from './sequence-card';
import { campaignStats, matchesFilter, rate, type RecipientFilter } from './stats';
import type { CampaignDraft } from './new/draft';
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
      first && sequences.data
        ? matchFollowUp({ batchId, mailboxId: first.mailboxId, subject: first.subject }, sequences.data)
        : null,
    [sequences.data, first, batchId],
  );
  const notOpened = useMemo(() => notOpenedEmails(emails), [emails]);
  const convex = useConvex();
  const toast = useToast();
  const [preparing, setPreparing] = useState(false);

  // Opens New campaign with the people who didn't open and, where it can be
  // found, the message as it was written (see send-again.ts).
  const prepareSendAgain = async () => {
    if (!first) return;
    setPreparing(true);
    try {
      // A subject with a merge field reaches each customer filled in ("Hi
      // John"), so a sent copy's subject is only the campaign's when they all match.
      const sameSubject = emails.every((e) => e.subject === first.subject);
      const which = sameSubject ? `"${first.subject}"` : 'this campaign';
      let subject = sameSubject ? first.subject : '';
      let body = '';
      let contentType: CampaignDraft['contentType'] = 'rich';
      let includeSignature = true;
      let found = false;
      let fieldsByEmail: Record<string, Record<string, unknown>> = {};
      const remembered = await recallCampaignMessage(batchId);
      const firstStep = followUp?.steps.find((step) => step.type === 'send_email');
      if (remembered) {
        ({ subject, body, contentType, includeSignature } = remembered);
        fieldsByEmail = remembered.fields ?? {};
        found = true;
      } else if (followUp && firstStep?.type === 'send_email') {
        subject = firstStep.subject;
        ({ body, includeSignature } = splitSignature(firstStep.html));
        found = true;
        // Names and columns travel with each follow-up contact.
        try {
          let cursor: string | null = null;
          for (let pages = 0; pages < 20; pages++) {
            const result: PaginationResult<SequenceEnrollment> = await convex.query(api.sequences.listEnrollmentsPage, {
              sequenceId: followUp._id,
              paginationOpts: { numItems: 500, cursor },
            });
            for (const e of result.page) {
              if (e.mergeFields && typeof e.mergeFields === 'object') fieldsByEmail[e.contactEmail.toLowerCase()] = e.mergeFields;
            }
            if (result.isDone) break;
            cursor = result.continueCursor;
          }
        } catch {
          // Without names the greeting falls back, e.g. "Hi there".
        }
      }
      const recipients = sendAgainRecipients(notOpened, fieldsByEmail);
      const handoff = setCampaignHandoff({
        mailboxId: first.mailboxId,
        recipients,
        columns: recipientColumns(recipients),
        sourceLabel: `Didn't open ${which}`,
        subject,
        body,
        contentType,
        includeSignature,
        notice: found
          ? `Sending again to ${plural(recipients.length, 'customer')} who didn't open ${which}. The same message is filled in: check it, then send.`
          : `Sending again to ${plural(recipients.length, 'customer')} who didn't open ${which}. The message as you wrote it isn't saved anywhere this app can reach, so write it again in the next step.${sameSubject ? ' The subject is filled in.' : ''}`,
      });
      router.push({ pathname: '/campaign-new', params: { mailboxId: first.mailboxId, handoff } });
    } finally {
      setPreparing(false);
    }
  };

  const shareCsv = () => {
    // Named after the subject only when it is the same for everyone (no merge field in it).
    const subject = first && emails.every((e) => e.subject === first.subject) ? first.subject : '';
    shareCampaignCsv(campaignCsv(emails), subject).catch((err: unknown) =>
      toast.show({ message: errorMessage(err, 'The CSV could not be shared.'), tone: 'error' }),
    );
  };

  const sendAgain = () => {
    if (followUp?.status !== 'active') return void prepareSendAgain();
    const message = "This campaign's follow-ups are still going out to people who haven't replied. Send a new campaign to those who didn't open anyway?";
    // Alert does nothing on the web build.
    if (process.env.EXPO_OS === 'web') {
      if (window.confirm(message)) void prepareSendAgain();
      return;
    }
    Alert.alert('Send again?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send again', onPress: () => void prepareSendAgain() },
    ]);
  };

  const filtered = useMemo(
    () => emails.filter((e) => matchesFilter(e, filter)).sort((a, b) => a.to[0]?.localeCompare(b.to[0] ?? '') ?? 0),
    [emails, filter],
  );

  if (recipients.error && emails.length === 0) return <ErrorState error={recipients.error} />;
  if (!first && recipients.loading) return <LoadingState label="Loading campaign" />;
  if (!first) {
    return recipients.paused ? (
      <EmptyState
        icon="campaign"
        title="Campaign not found"
        description="It wasn't in your most recent sent mail. It may be older."
        actionLabel="Keep looking"
        onAction={recipients.keepCounting}
      />
    ) : (
      <EmptyState
        icon="campaign"
        title="Campaign not found"
        description="It may have been sent from a mailbox you no longer have."
        actionLabel="Back to campaigns"
        onAction={() => router.back()}
      />
    );
  }
  // The figures wait until every message of the campaign is loaded, so a
  // 500 person send never reads as 100.
  if (!recipients.complete) {
    return recipients.paused ? (
      <EmptyState
        icon="campaign"
        title="Still counting"
        description={`This campaign is large, and ${plural(emails.length, 'recipient')} are counted so far.`}
        actionLabel="Keep counting"
        onAction={recipients.keepCounting}
      />
    ) : (
      <LoadingState label={`Counting ${plural(emails.length, 'recipient')} so far`} />
    );
  }

  const sent = stats.total - stats.scheduled;
  const scheduledAt = emails.find((e) => e.folder === 'outbox')?.scheduledAt;

  const header = (
    <View style={styles.headerContent}>
      <Stack.Screen
        options={{
          title: 'Campaign',
          headerRight: () => <IconButton icon="share" label="Share as CSV" color={theme.accent} onPress={shareCsv} />,
        }}
      />
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
      {sent > 0 ? (
        <ThemedText type="caption" themeColor="textMuted">
          Opens are a rough guide: some email apps open every message automatically. Replies are the surest sign.
        </ThemedText>
      ) : null}

      {stats.complained + stats.blocked > 0 ? (
        <Card style={{ backgroundColor: theme.warningSoft, borderColor: theme.warningSoft }}>
          <ThemedText type="small" themeColor="warning">
            {stats.blocked > 0 ? `${plural(stats.blocked, 'recipient')} not sent, for example because they unsubscribed or the address doesn't exist. ` : ''}
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

      {notOpened.length > 0 ? (
        <Button
          title={`Send again to ${notOpened.length.toLocaleString()} who didn't open`}
          icon="send"
          loading={preparing}
          disabled={preparing}
          onPress={sendAgain}
        />
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
  // What happened, in words: "Didn't arrive: this address does not exist".
  const status = recipientStatus(email);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${email.to.map(rawEmail).join(', ')}. ${status.label}`}
      onPress={() => router.push(emailHref(email))}
      style={({ pressed }) => [styles.recipient, pressed && { backgroundColor: theme.backgroundSelected }]}>
      {meta ? <Icon name={meta.icon} size={14} color={toneColor(status.tone)} /> : null}
      <View style={styles.flex}>
        <ThemedText type="body" numberOfLines={1}>
          {email.to.map(rawEmail).join(', ')}
        </ThemedText>
        <ThemedText type="caption" color={toneColor(status.tone)}>
          {status.label}
        </ThemedText>
      </View>
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
