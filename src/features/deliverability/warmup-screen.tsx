import { useMutation } from 'convex/react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, Group, ListRow, ListSkeleton, ProgressBar, Screen, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { WebLinks } from '@/lib/config';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Id, WarmupMailbox, WarmupSpeed } from '@/lib/convex/types';
import { listDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const SPEEDS: { value: WarmupSpeed; label: string }[] = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
];

export function WarmupScreen() {
  const sheet = useActionSheet();
  const toast = useToast();
  const { mailboxes, domainFor } = useWorkspace();
  const warmups = useLiveQuery(api.warmup.listForCurrentUser, {});
  const schedules = useLiveQuery(api.warmingSchedules.listForCurrentUser, {});
  const start = useMutation(api.warmup.startWarmup);

  if (warmups.status === 'loading') return <ListSkeleton avatar={false} />;
  if (warmups.status === 'error') return <ErrorState error={warmups.error} />;

  const enrolled = new Set(warmups.data.filter((w) => w.status !== 'completed').map((w) => w.mailboxId));
  const candidates = (mailboxes.data ?? []).filter((m) => !enrolled.has(m._id));

  const startFor = () =>
    sheet.show({
      title: 'Warm up which mailbox?',
      message: candidates.length ? 'The domain needs SPF, DKIM and DMARC in place first.' : 'Every mailbox is already warming up.',
      options: candidates.map((m) => ({
        label: m.fullAddress,
        icon: 'at' as const,
        onPress: async () => {
          const domain = domainFor(m);
          if (domain && !(domain.spfVerified && domain.dkimVerified && domain.dmarcVerified)) {
            toast.show({ message: `Finish DNS setup for ${domain.domain} before starting warmup.`, tone: 'error' });
            return;
          }
          try {
            await start({ mailboxId: m._id, speed: 'normal' });
            haptic('success');
            toast.show({ message: `Warmup started for ${m.fullAddress}`, icon: 'flame' });
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
          }
        },
      })),
    });

  return (
    <Screen>
      <ThemedText type="body" themeColor="textSecondary">
        Warmup exchanges a small, gradually growing number of real conversations with your mailbox, opening them, replying and rescuing them from spam, so mailbox providers learn to trust your address.
      </ThemedText>
      {warmups.data.length === 0 ? (
        <EmptyState icon="flame" title="No mailboxes warming up" description="Start warmup on a new mailbox a couple of weeks before its first campaign." actionLabel="Start warmup" onAction={startFor} />
      ) : (
        <>
          {warmups.data.map((w) => (
            <WarmupCard key={w._id} warmup={w} />
          ))}
          {candidates.length > 0 ? <Button title="Warm up another mailbox" icon="flame" variant="secondary" onPress={startFor} /> : null}
        </>
      )}

      {(schedules.data ?? []).length > 0 ? (
        <Group title="Sending ramps" footer="A ramp caps how much a new domain sends per day while its reputation builds.">
          {schedules.data!.map((s) => (
            <ListRow
              key={s._id}
              title={s.domainName}
              subtitle={`Day ${s.currentDay} of ${s.totalDays} · ${s.sentToday}/${s.dailyLimit} sent today`}
              icon="chart"
              right={<Badge label={s.status} tone={s.status === 'active' ? 'success' : s.status === 'paused' ? 'warning' : 'neutral'} />}
            />
          ))}
        </Group>
      ) : null}

      <Button title="How warmup works" variant="ghost" icon="docs" onPress={() => WebBrowser.openBrowserAsync(WebLinks.warmupDocs)} />
    </Screen>
  );
}

function WarmupCard({ warmup }: { warmup: WarmupMailbox }) {
  const theme = useTheme();
  const toast = useToast();
  const pause = useMutation(api.warmup.pauseWarmup);
  const resume = useMutation(api.warmup.resumeWarmup);
  const setSpeed = useMutation(api.warmup.updateSpeed);
  const recent = useLiveQuery(api.warmup.getRecentWarmupEmails, { warmupMailboxId: warmup._id as Id<'warmupMailboxes'>, limit: 5 });
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      haptic('success');
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const tone = warmup.status === 'active' ? 'success' : warmup.status === 'paused' ? 'warning' : 'neutral';

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <ThemedText type="subheading" numberOfLines={1}>
            {warmup.mailboxAddress}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Day {warmup.currentDay} · started {listDate(warmup.startedAt)}
          </ThemedText>
        </View>
        <Badge label={warmup.status === 'active' ? 'Warming' : warmup.status === 'paused' ? 'Paused' : 'Complete'} tone={tone} />
      </View>

      <View style={styles.metrics}>
        <Metric label="Health" value={`${warmup.healthScore}`} />
        <Metric label="Inbox rate" value={`${warmup.inboxRate}%`} />
        <Metric label="Sent today" value={`${warmup.sentToday}/${warmup.dailyLimit}`} />
        <Metric label="Received" value={`${warmup.receivedToday}`} />
      </View>
      <ProgressBar value={warmup.dailyLimit ? warmup.sentToday / warmup.dailyLimit : 0} color={theme.warning} />

      {warmup.pausedReason ? (
        <ThemedText type="small" themeColor="warning">
          {warmup.pausedReason}
        </ThemedText>
      ) : null}
      {warmup.lastSendError ? (
        <ThemedText type="small" themeColor="danger">
          Last send failed: {warmup.lastSendError}
        </ThemedText>
      ) : null}

      {warmup.status !== 'completed' ? (
        <>
          <Segmented value={warmup.speed} onChange={(speed) => run(() => setSpeed({ warmupMailboxId: warmup._id as Id<'warmupMailboxes'>, speed }))} options={SPEEDS} />
          <Button
            title={warmup.status === 'active' ? 'Pause warmup' : 'Resume warmup'}
            icon={warmup.status === 'active' ? 'pause' : 'resume'}
            variant="secondary"
            size="sm"
            loading={busy}
            onPress={() =>
              run(() =>
                warmup.status === 'active'
                  ? pause({ warmupMailboxId: warmup._id as Id<'warmupMailboxes'> })
                  : resume({ warmupMailboxId: warmup._id as Id<'warmupMailboxes'> }),
              )
            }
          />
        </>
      ) : null}

      {(recent.data ?? []).length > 0 ? (
        <View style={styles.recent}>
          <ThemedText type="label" themeColor="textSecondary">
            Recent activity
          </ThemedText>
          {recent.data!.map((e) => (
            <View key={e._id} style={styles.recentRow}>
              <ThemedText type="caption" style={styles.flex} numberOfLines={1}>
                {e.direction === 'outbound' ? '↗' : '↘'} {e.subject}
              </ThemedText>
              <Badge label={e.placement === 'inbox' ? 'Inbox' : e.placement === 'spam' ? (e.rescuedFromSpam ? 'Rescued' : 'Spam') : '—'} tone={e.placement === 'inbox' ? 'success' : e.placement === 'spam' ? 'warning' : 'neutral'} />
            </View>
          ))}
        </View>
      ) : null}
      <Button title="Mailbox settings" variant="ghost" size="sm" onPress={() => router.push(`/mailbox-settings/${warmup.mailboxId}`)} />
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <ThemedText type="bodyStrong">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textMuted">
        {label}
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
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recent: {
    gap: Spacing.two,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
