import { useAction, useMutation } from 'convex/react';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, ErrorState, Field, Group, ListRow, LoadingState, ProgressBar, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { SEQUENCE_STATUS } from '@/features/campaigns/sequence-card';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Id, Mailbox, WarmupSpeed } from '@/lib/convex/types';
import { haptic } from '@/lib/haptics';

export function MailboxSettingsScreen({ id }: { id: string }) {
  const mailbox = useLiveQuery(api.mailboxes.getById, { mailboxId: id as Id<'mailboxes'> });
  if (mailbox.status === 'loading') return <LoadingState />;
  if (mailbox.status === 'error') return <ErrorState error={mailbox.error} />;
  if (!mailbox.data) return <ErrorState title="Mailbox not found" error={new Error('It may have been deleted.')} onRetry={() => router.back()} />;
  return <Settings mailbox={mailbox.data} />;
}

function Settings({ mailbox }: { mailbox: Mailbox }) {
  const theme = useTheme();
  const toast = useToast();
  const sheet = useActionSheet();
  const { selectMailbox, setFolder, domainFor, unreadByMailbox } = useWorkspace();
  const updateName = useMutation(api.mailboxes.updateDisplayName);
  const remove = useAction(api.mailboxes.remove);
  const startWarmup = useMutation(api.warmup.startWarmup);
  const groups = useLiveQuery(api.senderGroups.list, { mailboxId: mailbox._id });
  const sequences = useLiveQuery(api.sequences.getByMailbox, { mailboxId: mailbox._id });
  const warmups = useLiveQuery(api.warmup.listForCurrentUser, {});
  const [draftName, setName] = useState<string | null>(null);
  const name = draftName ?? mailbox.displayName ?? '';
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const domain = domainFor(mailbox);
  const warmup = warmups.data?.find((w) => w.mailboxId === mailbox._id);
  const dirty = name.trim() !== (mailbox.displayName ?? '');

  const saveName = async () => {
    setSaving(true);
    try {
      await updateName({ mailboxId: mailbox._id, displayName: name });
      setName(null);
      haptic('success');
      toast.show({ message: 'Display name saved', icon: 'check' });
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openInbox = () => {
    selectMailbox(mailbox._id);
    setFolder('inbox');
    router.navigate('/');
  };

  const chooseWarmup = () =>
    sheet.show({
      title: 'Start warmup',
      message: 'Mailmark exchanges a small, growing number of real conversations with this mailbox to build its reputation.',
      options: (['slow', 'normal', 'fast'] as WarmupSpeed[]).map((speed) => ({
        label: speed === 'slow' ? 'Slow (safest)' : speed === 'normal' ? 'Normal' : 'Fast',
        icon: 'flame' as const,
        onPress: async () => {
          try {
            await startWarmup({ mailboxId: mailbox._id, speed });
            haptic('success');
            toast.show({ message: 'Warmup started', icon: 'flame' });
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
          }
        },
      })),
    });

  const confirmDelete = () =>
    Alert.alert(`Delete ${mailbox.fullAddress}?`, 'Every message in this mailbox is deleted, from Mailmark and from storage. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete mailbox',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await remove({ mailboxId: mailbox._id });
            haptic('success');
            router.back();
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
            setDeleting(false);
          }
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: mailbox.address }} />
      <View style={styles.header}>
        <ThemedText type="title">{mailbox.fullAddress}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {domain?.verified ? 'Ready to send and receive' : 'Domain not verified yet'} · {unreadByMailbox[mailbox._id] ?? 0} unread
        </ThemedText>
      </View>
      <Button title="Open inbox" icon="inbox" variant="secondary" onPress={openInbox} />

      <View style={styles.block}>
        <Field label="Display name" value={name} onChangeText={setName} placeholder="e.g. Ada from Acme" hint="Shown to recipients as the sender's name." returnKeyType="done" onSubmitEditing={dirty ? saveName : undefined} />
        {dirty ? <Button title="Save display name" size="sm" loading={saving} onPress={saveName} /> : null}
      </View>

      <Group title="Signature">
        <ListRow
          title={mailbox.signature ? 'Edit signature' : 'Add a signature'}
          subtitle={mailbox.signature ?? 'Added below messages you write. Markdown is supported.'}
          subtitleLines={3}
          icon="signature"
          onPress={() => router.push({ pathname: '/signature', params: { mailboxId: mailbox._id } })}
        />
      </Group>

      <Group
        title="Sender groups"
        footer="Saved recipient lists you can add to the To field or a campaign in one tap."
        accessory={
          <Button title="New" variant="ghost" size="sm" icon="add" onPress={() => router.push({ pathname: '/sender-group', params: { mailboxId: mailbox._id } })} />
        }>
        {(groups.data ?? []).map((g) => (
          <ListRow
            key={g._id}
            title={g.name}
            subtitle={`${g.emails.length} address${g.emails.length === 1 ? '' : 'es'} · ${g.mailboxIds.length} mailbox${g.mailboxIds.length === 1 ? '' : 'es'}`}
            icon="team"
            onPress={() => router.push({ pathname: '/sender-group', params: { mailboxId: mailbox._id, groupId: g._id } })}
          />
        ))}
      </Group>

      <Group title="Warmup">
        {warmup ? (
          <View style={styles.warmup}>
            <View style={styles.warmupTop}>
              <ThemedText type="body" style={styles.flex}>
                Day {warmup.currentDay} · {warmup.sentToday}/{warmup.dailyLimit} today
              </ThemedText>
              <Badge label={warmup.status} tone={warmup.status === 'active' ? 'success' : warmup.status === 'paused' ? 'warning' : 'neutral'} />
            </View>
            <ProgressBar value={warmup.healthScore / 100} color={warmup.healthScore >= 80 ? theme.success : theme.warning} />
            <ThemedText type="caption" themeColor="textSecondary">
              Health {warmup.healthScore}/100 · inbox rate {warmup.inboxRate}%
            </ThemedText>
            <Button title="Manage warmup" variant="ghost" size="sm" onPress={() => router.push('/warmup')} />
          </View>
        ) : (
          <ListRow title="Start warmup" subtitle="Recommended before sending campaigns from a new address" icon="flame" onPress={chooseWarmup} />
        )}
      </Group>

      {(sequences.data ?? []).length > 0 ? (
        <Group title="Follow-up sequences">
          {sequences.data!.map((s) => (
            <ListRow
              key={s._id}
              title={s.name}
              subtitle={`${s.stats.active} in progress · ${s.stats.replied} replied`}
              icon="sequence"
              right={<Badge label={SEQUENCE_STATUS[s.status].label} tone={SEQUENCE_STATUS[s.status].tone} />}
              onPress={() => router.push(`/sequence/${s._id}`)}
            />
          ))}
        </Group>
      ) : null}

      <Group title="Danger zone">
        <ListRow title="Delete mailbox" icon="trash" destructive disabled={deleting} onPress={confirmDelete} showChevron={false} />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  block: {
    gap: Spacing.two,
  },
  warmup: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  warmupTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
});
