import { useMutation } from 'convex/react';
import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, Icon, LoadingState, Segmented, SwipeRow } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { EmailBodyView } from '@/features/mail/email-body-view';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLivePaginated, useLiveQuery } from '@/lib/convex/hooks';
import type { EnrollmentStatus, Id, Sequence, SequenceEnrollment } from '@/lib/convex/types';
import { listDate, plural, shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

import { SEQUENCE_STATUS, followUpCount } from './sequence-card';

const ENROLLMENT_META: Record<EnrollmentStatus, { label: string; tone: 'success' | 'accent' | 'neutral' | 'danger' | 'info' }> = {
  active: { label: 'In progress', tone: 'info' },
  replied: { label: 'Replied', tone: 'accent' },
  completed: { label: 'Finished', tone: 'neutral' },
  bounced: { label: 'Bounced', tone: 'danger' },
  cancelled: { label: 'Stopped', tone: 'neutral' },
};

type Filter = 'all' | EnrollmentStatus;

/** "First email", "Follow-up 1", … for each send step, by step index. */
function stepLabels(steps: Sequence['steps']): Record<number, string> {
  const labels: Record<number, string> = {};
  let n = 0;
  steps.forEach((step, i) => {
    if (step.type !== 'send_email') return;
    labels[i] = n === 0 ? 'First email' : `Follow-up ${n}`;
    n += 1;
  });
  return labels;
}

export function SequenceScreen({ id }: { id: string }) {
  const sequence = useLiveQuery(api.sequences.getById, { sequenceId: id as Id<'sequences'> });
  if (sequence.status === 'loading') return <LoadingState />;
  if (sequence.status === 'error') return <ErrorState error={sequence.error} />;
  if (!sequence.data) return <ErrorState title="Sequence not found" error={new Error('It may have been removed.')} onRetry={() => router.back()} />;
  return <SequenceDetail sequence={sequence.data} />;
}

function SequenceDetail({ sequence }: { sequence: Sequence }) {
  const theme = useTheme();
  const toast = useToast();
  const pause = useMutation(api.sequences.pause);
  const resume = useMutation(api.sequences.resume);
  const cancel = useMutation(api.sequences.cancel);
  const cancelEnrollment = useMutation(api.sequences.cancelEnrollment);
  const enrollments = useLivePaginated(api.sequences.listEnrollmentsPage, { sequenceId: sequence._id }, 50);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [openStep, setOpenStep] = useState<number | null>(null);

  const status = SEQUENCE_STATUS[sequence.status];
  const visible = useMemo(
    () => (filter === 'all' ? enrollments.items : enrollments.items.filter((e) => e.status === filter)),
    [enrollments.items, filter],
  );

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      haptic('success');
      toast.show({ message: done, icon: 'check' });
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const confirmStop = () =>
    Alert.alert('Stop this sequence?', 'No more follow-ups will be sent to anyone in it. This cannot be undone.', [
      { text: 'Keep running', style: 'cancel' },
      { text: 'Stop sequence', style: 'destructive', onPress: () => run(() => cancel({ sequenceId: sequence._id }), 'Sequence stopped') },
    ]);

  const stopOne = (e: SequenceEnrollment) =>
    Alert.alert('Stop follow-ups for this person?', e.contactEmail, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => run(() => cancelEnrollment({ enrollmentId: e._id }), 'Follow-ups stopped') },
    ]);

  const steps = sequence.steps;
  const emailLabels = stepLabels(steps);

  const header = (
    <View style={styles.header}>
      <Stack.Screen options={{ title: 'Follow-up sequence' }} />
      <View style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.flex}>
            {sequence.name}
          </ThemedText>
          <Badge label={status.label} tone={status.tone} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {sequence.mailboxAddress} · {followUpCount(sequence)} follow-ups · started {shortDate(sequence.createdAt)}
        </ThemedText>
      </View>

      <View style={styles.stats}>
        {(
          [
            ['Enrolled', sequence.stats.total],
            ['In progress', sequence.stats.active],
            ['Replied', sequence.stats.replied],
            ['Finished', sequence.stats.completed],
            ['Bounced', sequence.stats.bounced],
          ] as const
        ).map(([label, value]) => (
          <View key={label} style={[styles.stat, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <ThemedText type="heading">{value.toLocaleString()}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {sequence.status === 'active' ? (
          <Button title="Pause" icon="pause" variant="secondary" loading={busy} onPress={() => run(() => pause({ sequenceId: sequence._id }), 'Sequence paused')} style={styles.flex} />
        ) : null}
        {sequence.status === 'paused' ? (
          <Button title="Resume" icon="resume" loading={busy} onPress={() => run(() => resume({ sequenceId: sequence._id }), 'Sequence resumed')} style={styles.flex} />
        ) : null}
        {sequence.status !== 'completed' ? (
          <Button title="Stop" icon="stop" variant="danger" disabled={busy} onPress={confirmStop} style={styles.flex} />
        ) : null}
      </View>

      <Card style={styles.steps}>
        <ThemedText type="label" themeColor="textSecondary">
          Steps
        </ThemedText>
        {steps.map((step, i) => {
          if (step.type === 'delay') {
            const days = Math.round(step.delayMs / 86_400_000);
            return (
              <View key={i} style={styles.step}>
                <Icon name="pending" size={14} color={theme.textMuted} />
                <ThemedText type="small" themeColor="textSecondary">
                  Wait {days >= 1 ? plural(days, 'day') : plural(Math.round(step.delayMs / 3_600_000), 'hour')}, stop if they reply
                </ThemedText>
              </View>
            );
          }
          const open = openStep === i;
          return (
            <View key={i} style={styles.stepBlock}>
              <Button
                title={`${emailLabels[i]}: ${step.subject}`}
                variant="ghost"
                size="sm"
                icon={open ? 'chevronUp' : 'mail'}
                onPress={() => setOpenStep(open ? null : i)}
                style={styles.stepButton}
              />
              {open ? <EmailBodyView html={step.html} /> : null}
            </View>
          );
        })}
      </Card>

      <Segmented
        scrollable
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Everyone' },
          { value: 'active', label: 'In progress' },
          { value: 'replied', label: 'Replied' },
          { value: 'completed', label: 'Finished' },
          { value: 'bounced', label: 'Bounced' },
          { value: 'cancelled', label: 'Stopped' },
        ]}
      />
    </View>
  );

  return (
    <FlatList<SequenceEnrollment>
      data={visible}
      keyExtractor={(e) => e._id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      onEndReachedThreshold={0.4}
      onEndReached={() => enrollments.canLoadMore && enrollments.loadMore()}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
      renderItem={({ item }) => {
        const meta = ENROLLMENT_META[item.status];
        const row = (
          <View style={[styles.row, { backgroundColor: theme.background }]}>
            <View style={styles.flex}>
              <ThemedText type="body" numberOfLines={1}>
                {item.contactEmail}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                Step {item.currentStep + 1} of {steps.length} · enrolled {listDate(item.enrolledAt)}
              </ThemedText>
            </View>
            <Badge label={meta.label} tone={meta.tone} />
          </View>
        );
        return item.status === 'active' ? (
          <SwipeRow trailing={[{ label: 'Stop', icon: 'stop', color: theme.danger, onPress: () => stopOne(item) }]}>{row}</SwipeRow>
        ) : (
          row
        );
      }}
      ListEmptyComponent={
        enrollments.status === 'loading' ? (
          <LoadingState />
        ) : (
          <ThemedText type="small" themeColor="textMuted" style={styles.empty}>
            Nobody in this view.
          </ThemedText>
        )
      }
      ListFooterComponent={enrollments.isLoadingMore ? <LoadingState /> : <View style={{ height: Spacing.eight }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  titleBlock: {
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  steps: {
    gap: Spacing.two,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
  },
  stepBlock: {
    gap: Spacing.two,
  },
  stepButton: {
    justifyContent: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    padding: Spacing.five,
  },
});
