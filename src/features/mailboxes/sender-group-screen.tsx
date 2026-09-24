import { useMutation } from 'convex/react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, Group, Icon, ListRow, LoadingState } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { RecipientField } from '@/features/compose/recipient-field';
import { pickCsvText } from '@/features/compose/pick-attachments';
import { fetchSheet } from '@/features/campaigns/new/import';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Id, SenderGroup } from '@/lib/convex/types';
import { scanEmails } from '@/lib/email/address';
import { haptic } from '@/lib/haptics';

export function SenderGroupScreen() {
  const { mailboxId, groupId } = useLocalSearchParams<{ mailboxId: string; groupId?: string }>();
  const groups = useLiveQuery(api.senderGroups.list, { mailboxId: mailboxId as Id<'mailboxes'> });
  if (groupId && groups.status === 'loading') return <LoadingState />;
  const existing = groups.data?.find((g) => g._id === groupId);
  return <GroupEditor key={existing?._id ?? 'new'} mailboxId={mailboxId} existing={existing} />;
}

function GroupEditor({ mailboxId, existing }: { mailboxId: string; existing?: SenderGroup }) {
  const theme = useTheme();
  const toast = useToast();
  const { mailboxes } = useWorkspace();
  const create = useMutation(api.senderGroups.create);
  const update = useMutation(api.senderGroups.update);
  const updateMailboxes = useMutation(api.senderGroups.updateMailboxes);
  const remove = useMutation(api.senderGroups.remove);

  const [name, setName] = useState(existing?.name ?? '');
  const [emails, setEmails] = useState<string[]>(existing?.emails ?? []);
  const [mailboxIds, setMailboxIds] = useState<string[]>(existing?.mailboxIds ?? [mailboxId]);
  const [sheetUrl, setSheetUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const current = mailboxes.data?.find((m) => m._id === mailboxId);
  const sameDomain = (mailboxes.data ?? []).filter((m) => m.domainId === current?.domainId);

  const addMany = (found: string[]) => {
    if (found.length === 0) {
      toast.show({ message: 'No email addresses found.', tone: 'error' });
      return;
    }
    setEmails((prev) => [...new Set([...prev, ...found])]);
    toast.show({ message: `${found.length} addresses added`, icon: 'team' });
  };

  const importCsv = async () => {
    try {
      const file = await pickCsvText();
      if (file) addMany(scanEmails(file.text));
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    }
  };

  const importSheet = async () => {
    try {
      addMany(scanEmails(await fetchSheet(sheetUrl)));
      setSheetUrl('');
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    }
  };

  const save = async () => {
    if (!name.trim() || emails.length === 0 || mailboxIds.length === 0) return;
    setBusy(true);
    try {
      if (existing) {
        await update({ id: existing._id, name: name.trim(), emails });
        await updateMailboxes({ id: existing._id, mailboxIds: mailboxIds as Id<'mailboxes'>[] });
      } else {
        await create({ mailboxId: mailboxId as Id<'mailboxes'>, name: name.trim(), emails });
      }
      haptic('success');
      router.back();
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    existing &&
    Alert.alert(`Delete “${existing.name}”?`, 'The addresses are not affected, only this saved list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove({ id: existing._id });
            router.back();
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
          }
        },
      },
    ]);

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <Stack.Screen
        options={{
          title: existing ? 'Edit group' : 'New group',
          headerRight: () => (
            <Pressable onPress={save} disabled={busy || !name.trim() || emails.length === 0} hitSlop={10} accessibilityRole="button">
              <ThemedText type="bodyStrong" themeColor={!name.trim() || emails.length === 0 ? 'textMuted' : 'accent'}>
                Save
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <View style={styles.inner}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Customers" autoFocus={!existing} />
        <View>
          <ThemedText type="label" themeColor="textSecondary">
            Addresses · {emails.length}
          </ThemedText>
          <RecipientField label="Add" value={emails} onChange={setEmails} />
        </View>
        <View style={styles.row}>
          <Button title="Import CSV" icon="table" variant="secondary" size="sm" onPress={importCsv} />
        </View>
        <Field label="Or import from a Google Sheet link" value={sheetUrl} onChangeText={setSheetUrl} placeholder="https://docs.google.com/spreadsheets/…" autoCapitalize="none" keyboardType="url" />
        {sheetUrl.trim() ? <Button title="Import sheet" size="sm" variant="secondary" onPress={importSheet} /> : null}

        {existing && sameDomain.length > 1 ? (
          <Group title="Available on" footer="Groups belong to a domain and can be shared by its mailboxes.">
            {sameDomain.map((m) => {
              const on = mailboxIds.includes(m._id);
              return (
                <ListRow
                  key={m._id}
                  title={m.fullAddress}
                  icon="at"
                  showChevron={false}
                  right={on ? <Icon name="check" size={16} color={theme.accent} /> : undefined}
                  onPress={() => setMailboxIds((ids) => (on ? ids.filter((x) => x !== m._id) : [...ids, m._id]))}
                />
              );
            })}
          </Group>
        ) : null}

        <Button title={existing ? 'Save changes' : 'Create group'} fullWidth loading={busy} disabled={!name.trim() || emails.length === 0 || mailboxIds.length === 0} onPress={save} />
        {existing ? <Button title="Delete group" variant="danger" fullWidth onPress={confirmDelete} /> : null}
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
