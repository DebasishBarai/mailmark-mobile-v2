import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useAction } from 'convex/react';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Group, Icon, ListRow, ProgressBar } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { schedulePresets } from '@/features/compose/schedule';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { fullDate, plural } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { exitModalStack } from '@/lib/navigation';
import { extractMergeFields, toSequenceTemplate } from '@/lib/merge-fields';

import { useCampaignDraft } from './draft';
import { newBatchId, sendCampaign, type SendProgress } from './send-campaign';

type Phase = { kind: 'review' } | { kind: 'sending'; progress: SendProgress; scheduledAt?: number } | { kind: 'done'; progress: SendProgress; batchId: string; scheduledAt?: number; error?: string };

export function ReviewScreen() {
  const theme = useTheme();
  const sheet = useActionSheet();
  const { draft } = useCampaignDraft();
  const { mailboxes } = useWorkspace();
  const mailbox = mailboxes.data?.find((m) => m._id === draft.mailboxId);
  const sendEmail = useAction(api.ses.sendEmail);
  const scheduleEmail = useAction(api.ses.scheduleEmail);
  const createSequence = useAction(api.sequences.createAndEnrollWithFirstSent);
  const [phase, setPhase] = useState<Phase>({ kind: 'review' });
  const [picking, setPicking] = useState(false);
  const [customDate, setCustomDate] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [minimumDate] = useState(() => new Date(Date.now() + 5 * 60 * 1000));
  const cancelled = useRef(false);

  const unsupported = draft.followUps.flatMap((f) => [...toSequenceTemplate(f.subject).unsupported, ...toSequenceTemplate(f.body).unsupported]);
  const fieldsUsed = extractMergeFields(draft.subject + draft.body);

  const start = async (scheduledAt?: number) => {
    if (!mailbox) return;
    cancelled.current = false;
    const batchId = newBatchId();
    setPhase({ kind: 'sending', progress: { done: 0, total: draft.recipients.length, failed: [] }, scheduledAt });
    try {
      const progress = await sendCampaign(draft, mailbox, { sendEmail, scheduleEmail, createSequence }, {
        batchId,
        scheduledAt,
        onProgress: (p) => setPhase({ kind: 'sending', progress: p, scheduledAt }),
        isCancelled: () => cancelled.current,
      });
      haptic(progress.failed.length ? 'warning' : 'success');
      setPhase({ kind: 'done', progress, batchId, scheduledAt });
    } catch (err) {
      haptic('error');
      setPhase((p) => ({
        kind: 'done',
        progress: p.kind === 'sending' ? p.progress : { done: 0, total: draft.recipients.length, failed: [] },
        batchId,
        scheduledAt,
        error: errorMessage(err, 'The follow-up sequence could not be created.'),
      }));
    }
  };

  const confirmSend = () =>
    Alert.alert(
      `Send to ${plural(draft.recipients.length, 'recipient')}?`,
      `Messages go out from ${mailbox?.fullAddress} now. Keep Mailmark open until sending finishes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send now', onPress: () => start() },
      ],
    );

  const openSchedule = () =>
    sheet.show({
      title: 'Schedule campaign',
      options: [
        ...schedulePresets().map((p) => ({ label: p.label, icon: 'calendar' as const, onPress: () => start(p.at.getTime()) })),
        { label: 'Pick date & time…', icon: 'calendar', onPress: () => setPicking(true) },
      ],
    });

  if (phase.kind === 'sending') return <Sending phase={phase} onCancel={() => (cancelled.current = true)} />;
  if (phase.kind === 'done') return <Done phase={phase} />;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Review' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <ThemedText type="small" themeColor="textSecondary">
            Step 4 of 4 · Check everything before it goes out
          </ThemedText>
          <Group title="Campaign">
            <ListRow title="From" value={mailbox?.fullAddress} icon="at" onPress={() => router.dismissAll()} />
            <ListRow title="Recipients" value={draft.recipients.length.toLocaleString()} icon="team" onPress={() => router.dismissAll()} />
            <ListRow title="Subject" subtitle={draft.subject} icon="mail" onPress={() => router.back()} />
            <ListRow
              title="Personalisation"
              value={fieldsUsed.length ? plural(fieldsUsed.length, 'field') : 'None'}
              icon="merge"
            />
            <ListRow title="Follow-ups" value={draft.followUps.length ? String(draft.followUps.length) : 'None'} icon="sequence" onPress={() => router.back()} />
          </Group>

          {unsupported.length > 0 ? (
            <Card style={{ backgroundColor: theme.warningSoft, borderColor: theme.warningSoft }}>
              <ThemedText type="small" themeColor="warning">
                These follow-up merge fields will not be filled in: {[...new Set(unsupported)].join(', ')}. Follow-ups support one-word column names without fallbacks.
              </ThemedText>
            </Card>
          ) : null}

          <Card style={styles.note}>
            <Icon name="shield" size={16} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
              Every address is checked against your suppressions, unsubscribes and verification before sending. Refused addresses are skipped and listed when sending finishes.
            </ThemedText>
          </Card>

          <Button title={`Send to ${plural(draft.recipients.length, 'recipient')}`} icon="send" size="lg" fullWidth onPress={confirmSend} disabled={!mailbox} />
          <Button title="Schedule for later" icon="calendar" variant="secondary" size="lg" fullWidth onPress={openSchedule} disabled={!mailbox} />

          {picking ? (
            <Card style={styles.picker}>
              <DateTimePicker
                value={customDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={minimumDate}
                accentColor={theme.accent}
                onValueChange={(_, date) => setCustomDate(date)}
              />
              <Button
                title={`Schedule for ${fullDate(customDate.getTime())}`}
                onPress={() => {
                  setPicking(false);
                  void start(customDate.getTime());
                }}
              />
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Sending({ phase, onCancel }: { phase: Extract<Phase, { kind: 'sending' }>; onCancel: () => void }) {
  useKeepAwake();
  const { progress } = phase;
  return (
    <View style={[styles.root, styles.center]}>
      <Stack.Screen options={{ title: phase.scheduledAt ? 'Scheduling' : 'Sending', headerBackVisible: false, gestureEnabled: false }} />
      <ThemedText type="title">{phase.scheduledAt ? 'Scheduling…' : 'Sending…'}</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        {progress.done.toLocaleString()} of {progress.total.toLocaleString()}
      </ThemedText>
      <View style={styles.progress}>
        <ProgressBar value={progress.total ? progress.done / progress.total : 0} height={8} />
      </View>
      {progress.failed.length ? (
        <ThemedText type="small" themeColor="warning">
          {plural(progress.failed.length, 'recipient')} skipped so far
        </ThemedText>
      ) : null}
      <ThemedText type="caption" themeColor="textMuted" style={styles.centerText}>
        Keep Mailmark open until this finishes. The screen will stay on.
      </ThemedText>
      <Button title="Stop sending" variant="danger" onPress={onCancel} />
    </View>
  );
}

function Done({ phase }: { phase: Extract<Phase, { kind: 'done' }> }) {
  const theme = useTheme();
  const { progress } = phase;
  const ok = progress.done - progress.failed.length;
  return (
    <ScrollView contentContainerStyle={[styles.scroll, styles.doneScroll]}>
      <Stack.Screen options={{ title: 'Done', headerBackVisible: false, gestureEnabled: false }} />
      <View style={[styles.inner, styles.doneInner]}>
        <View style={[styles.doneIcon, { backgroundColor: ok > 0 ? theme.successSoft : theme.dangerSoft }]}>
          <Icon name={ok > 0 ? 'checkCircle' : 'warning'} size={32} color={ok > 0 ? theme.success : theme.danger} />
        </View>
        <ThemedText type="title" style={styles.centerText}>
          {phase.scheduledAt ? `${plural(ok, 'message')} scheduled` : `${plural(ok, 'message')} sent`}
        </ThemedText>
        {phase.scheduledAt ? (
          <ThemedText type="body" themeColor="textSecondary" style={styles.centerText}>
            Going out {fullDate(phase.scheduledAt)}
          </ThemedText>
        ) : null}
        {phase.error ? (
          <ThemedText type="small" themeColor="danger" style={styles.centerText}>
            {phase.error}
          </ThemedText>
        ) : null}
        {progress.done < progress.total ? (
          <ThemedText type="small" themeColor="warning" style={styles.centerText}>
            Stopped before {plural(progress.total - progress.done, 'recipient')} were sent.
          </ThemedText>
        ) : null}
        {progress.failed.length > 0 ? (
          <Group title={`${progress.failed.length} not sent`}>
            {progress.failed.slice(0, 50).map((f) => (
              <ListRow key={f.email} title={f.email} subtitle={f.reason} subtitleLines={3} icon="block" iconColor={theme.danger} />
            ))}
          </Group>
        ) : null}
        {ok > 0 ? (
          <Button
            title="View campaign"
            icon="analytics"
            fullWidth
            onPress={() => exitModalStack(`/campaign/${encodeURIComponent(phase.batchId)}`)}
          />
        ) : null}
        <Button title="Done" variant="secondary" fullWidth onPress={() => exitModalStack()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: Spacing.eight,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  note: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  picker: {
    gap: Spacing.three,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  progress: {
    width: '80%',
    maxWidth: 360,
  },
  doneScroll: {
    paddingTop: Spacing.six,
  },
  doneInner: {
    alignItems: 'stretch',
  },
  doneIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
