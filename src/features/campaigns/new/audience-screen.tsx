import { useAction } from 'convex/react';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Chip, Group, ListRow } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { pickCsvText } from '@/features/compose/pick-attachments';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Id } from '@/lib/convex/types';
import { scanEmails } from '@/lib/email/address';
import { plural } from '@/lib/format';
import { haptic } from '@/lib/haptics';

import { mergeRecipients, useCampaignDraft, type MergeRecipient } from './draft';
import { fetchSheet, interpretCsv } from './import';
import { StepFooter } from './step-footer';

type Mode = null | 'paste' | 'sheet';

export function AudienceScreen() {
  const theme = useTheme();
  const toast = useToast();
  const sheet = useActionSheet();
  const { draft, update } = useCampaignDraft();
  const { mailboxes } = useWorkspace();
  const verify = useAction(api.verification.verifyForCurrentUser);
  const [mode, setMode] = useState<Mode>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<{ valid: number; invalid: string[]; unknown: number; checked: number } | null>(null);

  const list = mailboxes.data ?? [];
  const mailbox = list.find((m) => m._id === draft.mailboxId) ?? list[0];
  const groups = useLiveQuery(api.senderGroups.list, mailbox ? { mailboxId: mailbox._id as Id<'mailboxes'> } : 'skip');

  const add = (incoming: MergeRecipient[], columns: string[], label: string, skipped = 0) => {
    const merged = mergeRecipients(draft.recipients, incoming);
    const added = merged.length - draft.recipients.length;
    update({
      recipients: merged,
      columns: [...new Set([...draft.columns, ...columns])],
      sourceLabel: draft.sourceLabel ? `${draft.sourceLabel} + ${label}` : label,
    });
    setVerdicts(null);
    haptic('success');
    toast.show({
      message: `${plural(added, 'recipient')} added${skipped ? ` · ${skipped} rows without a valid address skipped` : ''}`,
      icon: 'team',
    });
  };

  const importCsv = async () => {
    setBusy('csv');
    try {
      const file = await pickCsvText();
      if (!file) return;
      const result = interpretCsv(file.text);
      if (!result.ok) toast.show({ message: result.error, tone: 'error' });
      else add(result.recipients, result.columns, file.name, result.skipped);
    } catch (err) {
      toast.show({ message: errorMessage(err, 'Could not read that file.'), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const importSheet = async () => {
    if (!text.trim()) return;
    setBusy('sheet');
    try {
      const csv = await fetchSheet(text);
      const result = interpretCsv(csv);
      if (!result.ok) toast.show({ message: result.error, tone: 'error' });
      else {
        add(result.recipients, result.columns, 'Google Sheet', result.skipped);
        setText('');
        setMode(null);
      }
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const importPaste = () => {
    const emails = scanEmails(text);
    if (emails.length === 0) {
      toast.show({ message: 'No email addresses found.', tone: 'error' });
      return;
    }
    add(emails.map((email) => ({ email, fields: { email } })), [], 'Pasted list');
    setText('');
    setMode(null);
  };

  const addGroup = () => {
    const available = groups.data ?? [];
    sheet.show({
      title: 'Add a sender group',
      message: available.length ? undefined : 'This mailbox has no sender groups yet.',
      options: available.map((g) => ({
        label: `${g.name} (${g.emails.length})`,
        icon: 'team' as const,
        onPress: () => add(g.emails.map((email) => ({ email, fields: { email } })), [], g.name),
      })),
    });
  };

  const checkAddresses = async () => {
    setBusy('verify');
    try {
      const sample = draft.recipients.slice(0, 100).map((r) => r.email);
      const result = await verify({ emails: sample });
      setVerdicts({
        valid: result.summary.valid,
        unknown: result.summary.unknown,
        invalid: result.results.filter((r) => !r.isValid).map((r) => r.email.toLowerCase()),
        checked: sample.length,
      });
    } catch (err) {
      toast.show({ message: errorMessage(err, 'Could not verify addresses right now.'), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const removeInvalid = () => {
    if (!verdicts) return;
    const bad = new Set(verdicts.invalid);
    update({ recipients: draft.recipients.filter((r) => !bad.has(r.email.toLowerCase())) });
    toast.show({ message: `${plural(bad.size, 'address', 'addresses')} removed`, icon: 'check' });
    setVerdicts({ ...verdicts, invalid: [] });
  };

  const chooseMailbox = () =>
    sheet.show({
      title: 'Send from',
      options: list.map((m) => ({
        label: m.displayName ? `${m.displayName} <${m.fullAddress}>` : m.fullAddress,
        icon: 'at' as const,
        onPress: () => update({ mailboxId: m._id }),
      })),
    });

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Audience' }} />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <ThemedText type="small" themeColor="textSecondary">
            Step 1 of 4 · Who receives this campaign
          </ThemedText>

          <Group title="Send from">
            <ListRow
              title={mailbox?.displayName || mailbox?.address || 'No mailbox'}
              subtitle={mailbox?.fullAddress}
              icon="at"
              onPress={list.length > 1 ? chooseMailbox : undefined}
            />
          </Group>

          <Group title="Add recipients" footer="A CSV or sheet with a header row becomes a mail merge: every column can be used as {Column} in the subject and body.">
            <ListRow title="Import a CSV file" subtitle="From Files, Drive or iCloud" icon="table" iconTint="#3f6b44" onPress={importCsv} disabled={busy !== null} />
            <ListRow title="Google Sheets link" subtitle="Shared as “Anyone with the link”" icon="link" iconTint="#3a5f8a" onPress={() => setMode(mode === 'sheet' ? null : 'sheet')} />
            <ListRow title="Paste addresses" subtitle="Any text containing email addresses" icon="copy" iconTint="#8a5a2b" onPress={() => setMode(mode === 'paste' ? null : 'paste')} />
            <ListRow title="Sender group" subtitle="A saved list on this mailbox" icon="team" iconTint="#6b4b8a" onPress={addGroup} />
          </Group>

          {mode ? (
            <Card style={styles.inputCard}>
              <TextInput
                value={text}
                onChangeText={setText}
                autoFocus
                multiline={mode === 'paste'}
                placeholder={mode === 'sheet' ? 'https://docs.google.com/spreadsheets/d/…' : 'ada@example.com, grace@example.com…'}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={mode === 'sheet' ? 'url' : 'email-address'}
                style={[styles.input, { color: theme.text, borderColor: theme.border, minHeight: mode === 'paste' ? 120 : 44 }]}
              />
              <Button
                title={mode === 'sheet' ? 'Import sheet' : 'Add addresses'}
                loading={busy === 'sheet'}
                disabled={!text.trim()}
                onPress={mode === 'sheet' ? importSheet : importPaste}
              />
            </Card>
          ) : null}

          {draft.recipients.length > 0 ? (
            <Card style={styles.summary}>
              <View style={styles.summaryTop}>
                <ThemedText type="heading" style={styles.flex}>
                  {plural(draft.recipients.length, 'recipient')}
                </ThemedText>
                <Button
                  title="Clear"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    update({ recipients: [], columns: [], sourceLabel: null });
                    setVerdicts(null);
                  }}
                />
              </View>
              {draft.sourceLabel ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  From {draft.sourceLabel}
                </ThemedText>
              ) : null}
              {draft.columns.length > 0 ? (
                <View style={styles.chips}>
                  {draft.columns.map((c) => (
                    <Chip key={c} label={`{${c}}`} icon="merge" />
                  ))}
                </View>
              ) : null}
              <View style={[styles.preview, { borderColor: theme.border }]}>
                {draft.recipients.slice(0, 4).map((r) => (
                  <ThemedText key={r.email} type="small" numberOfLines={1}>
                    {r.email}
                    {draft.columns.length > 1 ? (
                      <ThemedText type="small" themeColor="textMuted">
                        {'  '}
                        {Object.entries(r.fields)
                          .filter(([k]) => k.toLowerCase() !== 'email')
                          .slice(0, 2)
                          .map(([, v]) => v)
                          .join(' · ')}
                      </ThemedText>
                    ) : null}
                  </ThemedText>
                ))}
                {draft.recipients.length > 4 ? (
                  <ThemedText type="caption" themeColor="textMuted">
                    and {plural(draft.recipients.length - 4, 'more')}
                  </ThemedText>
                ) : null}
              </View>
              {verdicts ? (
                <View style={styles.verdicts}>
                  <ThemedText type="small">
                    Checked {verdicts.checked}: {verdicts.valid} valid · {verdicts.invalid.length} invalid · {verdicts.unknown} unknown
                  </ThemedText>
                  {verdicts.invalid.length > 0 ? <Button title="Remove invalid" variant="danger" size="sm" onPress={removeInvalid} /> : null}
                  {draft.recipients.length > 100 ? (
                    <ThemedText type="caption" themeColor="textMuted">
                      The first 100 were checked here. Every address is verified again when it is sent, and invalid ones are skipped.
                    </ThemedText>
                  ) : null}
                </View>
              ) : (
                <Button title="Check addresses" variant="secondary" size="sm" icon="shield" loading={busy === 'verify'} onPress={checkAddresses} />
              )}
            </Card>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
      <StepFooter
        hint={draft.recipients.length ? plural(draft.recipients.length, 'recipient') : 'Add at least one recipient'}
        title="Write"
        disabled={!mailbox || draft.recipients.length === 0}
        onPress={() => {
          if (!draft.mailboxId && mailbox) update({ mailboxId: mailbox._id });
          router.push('/campaign-new/content');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.five,
  },
  inputCard: {
    gap: Spacing.three,
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  summary: {
    gap: Spacing.three,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  preview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  verdicts: {
    gap: Spacing.two,
  },
});
