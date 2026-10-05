import { Stack, router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { Card, Chip, IconButton, Segmented } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { EmailBodyView } from '@/features/mail/email-body-view';
import { useWorkspace } from '@/features/workspace/workspace';
import { ComposeBodyEditor, type ComposeBodyEditorHandle } from '@/features/compose/compose-body-editor';
import { useFormatChooser } from '@/features/compose/use-format-chooser';
import { useTheme } from '@/hooks/use-theme';
import { buildBody } from '@/lib/email/compose';
import { FORMAT_LABELS } from '@/lib/email/format';
import { escapesMergeValues, extractMergeFields, mergeTag, resolveMergeFields } from '@/lib/merge-fields';

import { useCampaignDraft } from './draft';
import { StepFooter } from './step-footer';

type Target = 'subject' | 'body';

export function ContentScreen() {
  const theme = useTheme();
  const { draft, update } = useCampaignDraft();
  const { mailboxes } = useWorkspace();
  const mailbox = mailboxes.data?.find((m) => m._id === draft.mailboxId);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [previewIndex, setPreviewIndex] = useState(0);
  const target = useRef<Target>('body');
  const subjectSelection = useRef({ start: 0, end: 0 });
  const bodyEditor = useRef<ComposeBodyEditorHandle>(null);

  const fields = draft.columns.length > 0 ? draft.columns : ['email'];
  const used = useMemo(() => extractMergeFields(draft.subject + draft.body), [draft.subject, draft.body]);
  const unknown = used.filter((f) => !fields.includes(f));

  const insert = (field: string) => {
    const tag = mergeTag(field);
    if (target.current === 'body') {
      // The body editor knows its own caret, in rich text and source alike.
      bodyEditor.current?.insertText(tag);
      return;
    }
    const { start, end } = subjectSelection.current;
    update({ subject: draft.subject.slice(0, start) + tag + draft.subject.slice(end) });
    subjectSelection.current = { start: start + tag.length, end: start + tag.length };
  };

  const recipient = draft.recipients[Math.min(previewIndex, draft.recipients.length - 1)];
  const previewSubject = recipient ? resolveMergeFields(draft.subject, recipient.fields) : draft.subject;
  const previewHtml = useMemo(() => {
    const html = buildBody({
      body: draft.body,
      contentType: draft.contentType,
      signature: draft.includeSignature ? mailbox?.signature : undefined,
    });
    return recipient ? resolveMergeFields(html, recipient.fields, { escapeValues: escapesMergeValues(draft.contentType) }) : html;
  }, [draft.body, draft.contentType, draft.includeSignature, mailbox?.signature, recipient]);

  const showFormats = useFormatChooser({
    format: draft.contentType,
    body: draft.body,
    onSwitch: (contentType, body) => update({ contentType, body }),
  });
  const chooseFormat = () => showFormats();

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Message' }} />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <ThemedText type="small" themeColor="textSecondary">
            Step 2 of 4 · What they receive
          </ThemedText>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'write', label: 'Write' },
              { value: 'preview', label: 'Preview' },
            ]}
          />

          {tab === 'write' ? (
            <>
              <View style={styles.fieldBlock}>
                <ThemedText type="label" themeColor="textSecondary">
                  Merge fields · tap to insert
                </ThemedText>
                <View style={styles.chips}>
                  {fields.map((f) => (
                    <Chip key={f} label={mergeTag(f)} icon="merge" selected={used.includes(f)} onPress={() => insert(f)} />
                  ))}
                </View>
                <ThemedText type="caption" themeColor="textMuted">
                  Use {'{{Field|fallback}}'} to fill in a value when a row is blank.
                </ThemedText>
              </View>

              <TextInput
                value={draft.subject}
                onChangeText={(subject) => update({ subject })}
                onFocus={() => (target.current = 'subject')}
                onSelectionChange={(e) => (subjectSelection.current = e.nativeEvent.selection)}
                placeholder="Subject"
                placeholderTextColor={theme.textMuted}
                accessibilityLabel="Subject"
                style={[styles.subject, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
              />
              <View style={styles.formatRow}>
                <Chip
                  label={FORMAT_LABELS[draft.contentType]}
                  icon="code"
                  onPress={chooseFormat}
                />
              </View>
              <ComposeBodyEditor
                ref={bodyEditor}
                format={draft.contentType}
                value={draft.body}
                onChange={(body) => update({ body })}
                onFocus={() => (target.current = 'body')}
                placeholder={`Hi ${mergeTag(fields.find((f) => /first|name/i.test(f)) ?? fields[0])},\n\n…`}
                inputStyle={[styles.body, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}
              />
              {mailbox?.signature ? (
                <Card style={styles.option}>
                  <View style={styles.flex}>
                    <ThemedText type="smallStrong">Include signature</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                      {mailbox.signature}
                    </ThemedText>
                  </View>
                  <Switch
                    value={draft.includeSignature}
                    onValueChange={(includeSignature) => update({ includeSignature })}
                    trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                  />
                </Card>
              ) : null}
              {unknown.length > 0 ? (
                <ThemedText type="caption" themeColor="warning">
                  {unknown.map((f) => mergeTag(f)).join(', ')} {unknown.length === 1 ? 'is not a column' : 'are not columns'} in your recipient list and will be sent as typed.
                </ThemedText>
              ) : null}
            </>
          ) : (
            <>
              {recipient ? (
                <View style={styles.previewNav}>
                  <IconButton icon="back" label="Previous recipient" disabled={previewIndex === 0} onPress={() => setPreviewIndex((i) => Math.max(0, i - 1))} />
                  <View style={styles.flexCenter}>
                    <ThemedText type="smallStrong" numberOfLines={1}>
                      {recipient.email}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">
                      {previewIndex + 1} of {draft.recipients.length}
                    </ThemedText>
                  </View>
                  <IconButton
                    icon="chevronRight"
                    label="Next recipient"
                    disabled={previewIndex >= draft.recipients.length - 1}
                    onPress={() => setPreviewIndex((i) => Math.min(draft.recipients.length - 1, i + 1))}
                  />
                </View>
              ) : null}
              <View style={[styles.previewSubject, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
                <ThemedText type="caption" themeColor="textMuted">
                  Subject
                </ThemedText>
                <ThemedText type="bodyStrong">{previewSubject || '(no subject)'}</ThemedText>
              </View>
              <EmailBodyView html={previewHtml || '<p style="color:#999">Nothing written yet.</p>'} />
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
      <StepFooter
        hint={!draft.subject.trim() ? 'Add a subject' : !draft.body.trim() ? 'Write a message' : undefined}
        title="Follow-ups"
        disabled={!draft.subject.trim() || !draft.body.trim()}
        onPress={() => router.push('/campaign-new/follow-ups')}
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
    gap: Spacing.four,
  },
  fieldBlock: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  subject: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  formatRow: {
    flexDirection: 'row',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 240,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  flexCenter: {
    flex: 1,
    alignItems: 'center',
  },
  previewNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewSubject: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
});
