import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useAction, useMutation } from 'convex/react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button, Chip, Icon, IconButton, LoadingState } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { EmailBodyView } from '@/features/mail/email-body-view';
import { useEmailBody } from '@/features/mail/use-email-body';
import { usePreferences } from '@/features/settings/preferences';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Email, Id, Mailbox } from '@/lib/convex/types';
import { isValidEmail, rawEmail } from '@/lib/email/address';
import {
  buildBody,
  forwardQuote,
  forwardSubject,
  replyAllRecipients,
  replyQuote,
  replySubject,
  type ContentType,
} from '@/lib/email/compose';
import { bytes, fullDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

import { draftStore, type LocalDraft } from './drafts';
import { MAX_ATTACHMENT_BYTES, pickFiles, pickPhotos, takePhoto, type PickedAttachment } from './pick-attachments';
import { RecipientField, type Verification } from './recipient-field';
import { isInFuture, schedulePresets } from './schedule';
import { useContactSuggestions } from './use-contact-suggestions';

type Mode = 'compose' | 'reply' | 'replyAll' | 'forward';

type Params = {
  mailboxId?: string;
  mode?: Mode;
  emailId?: string;
  draftId?: string;
  fromEmailId?: string;
  to?: string;
  subject?: string;
};

export function ComposeScreen() {
  const params = useLocalSearchParams<Params>();
  const { mailboxes, mailbox: current } = useWorkspace();
  const sourceId = (params.emailId ?? params.fromEmailId) as Id<'emails'> | undefined;
  const source = useLiveQuery(api.emails.getById, sourceId ? { emailId: sourceId } : 'skip');
  const sourceBody = useEmailBody(sourceId ? source.data : undefined);

  if (mailboxes.status === 'loading' || (sourceId && (source.status === 'loading' || (source.data && sourceBody.status === 'loading')))) {
    return <LoadingState label="Preparing message" />;
  }
  if (!mailboxes.data || mailboxes.data.length === 0) {
    return (
      <View style={styles.center}>
        <ThemedText type="subheading">No mailbox to send from</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          Create a mailbox on a verified domain first.
        </ThemedText>
        <Button title="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const draft = params.draftId ? draftStore.get(params.draftId) : undefined;
  const mailboxId = draft?.mailboxId ?? params.mailboxId ?? source.data?.mailboxId ?? current?._id;
  const initialMailbox = mailboxes.data.find((m) => m._id === mailboxId) ?? mailboxes.data[0];

  return (
    <Composer
      mailboxes={mailboxes.data}
      initialMailbox={initialMailbox}
      mode={draft?.mode ?? params.mode ?? 'compose'}
      source={source.data ?? undefined}
      sourceHtml={sourceBody.status === 'success' ? sourceBody.body.body : ''}
      serverDraftId={params.fromEmailId as Id<'emails'> | undefined}
      draft={draft}
      prefillTo={params.to}
      prefillSubject={params.subject}
    />
  );
}

function Composer({
  mailboxes,
  initialMailbox,
  mode,
  source,
  sourceHtml,
  serverDraftId,
  draft,
  prefillTo,
  prefillSubject,
}: {
  mailboxes: Mailbox[];
  initialMailbox: Mailbox;
  mode: Mode;
  source?: Email;
  sourceHtml: string;
  serverDraftId?: Id<'emails'>;
  draft?: LocalDraft;
  prefillTo?: string;
  prefillSubject?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = useActionSheet();
  const toast = useToast();
  const sendEmail = useAction(api.ses.sendEmail);
  const scheduleEmail = useAction(api.ses.scheduleEmail);
  const verify = useAction(api.verification.verifyForCurrentUser);
  const deleteServerDraft = useMutation(api.emails.deleteEmail);
  const suggestions = useContactSuggestions(true);
  const { prefs } = usePreferences();

  const initial = useMemo(() => {
    if (draft) return draft;
    const base = { to: [] as string[], cc: [] as string[], bcc: [] as string[], subject: prefillSubject ?? '', body: '', quote: '' };
    if (source && serverDraftId) {
      return { ...base, to: source.to.map(rawEmail), cc: (source.cc ?? []).map(rawEmail), bcc: (source.bcc ?? []).map(rawEmail), subject: source.subject, body: sourceHtml };
    }
    if (source && mode === 'reply') {
      return { ...base, to: [rawEmail(source.from)], subject: replySubject(source.subject), quote: replyQuote(source, sourceHtml) };
    }
    if (source && mode === 'replyAll') {
      const { to, cc } = replyAllRecipients(source, initialMailbox.fullAddress);
      return { ...base, to, cc, subject: replySubject(source.subject), quote: replyQuote(source, sourceHtml) };
    }
    if (source && mode === 'forward') {
      return { ...base, subject: forwardSubject(source.subject), quote: forwardQuote(source, sourceHtml) };
    }
    return { ...base, to: prefillTo && isValidEmail(prefillTo) ? [prefillTo] : [] };
  }, [draft, source, serverDraftId, sourceHtml, mode, initialMailbox.fullAddress, prefillTo, prefillSubject]);

  const draftId = useRef(draft?.id ?? draftStore.newId());
  const [mailbox, setMailbox] = useState(initialMailbox);
  const [to, setTo] = useState<string[]>(initial.to);
  const [cc, setCc] = useState<string[]>(initial.cc);
  const [bcc, setBcc] = useState<string[]>(initial.bcc);
  const [showCcBcc, setShowCcBcc] = useState(initial.cc.length + initial.bcc.length > 0);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [contentType, setContentType] = useState<ContentType>(draft?.contentType ?? (serverDraftId ? 'html' : 'plain'));
  const [quote] = useState(draft?.quote ?? initial.quote);
  const [includeQuote, setIncludeQuote] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState<'send' | 'schedule' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<Record<string, Verification>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customDate, setCustomDate] = useState(() => new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [minimumDate] = useState(() => new Date(Date.now() + 5 * 60 * 1000));
  const sent = useRef(false);

  const groups = useLiveQuery(api.senderGroups.list, { mailboxId: mailbox._id });
  const selectedGroups = (groups.data ?? []).filter((g) => groupIds.includes(g._id));

  // ── Autosave to this device ──
  useEffect(() => {
    if (sent.current) return;
    const timer = setTimeout(() => {
      const value: LocalDraft = {
        id: draftId.current,
        mailboxId: mailbox._id,
        to,
        cc,
        bcc,
        subject,
        body,
        contentType,
        mode,
        replyToEmailId: source?._id,
        quote: includeQuote ? quote : '',
        updatedAt: Date.now(),
      };
      if (!draftStore.isEmpty(value) && (value.body.trim() || value.subject !== initial.subject || value.to.join() !== initial.to.join())) {
        draftStore.save(value);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [mailbox._id, to, cc, bcc, subject, body, contentType, mode, source?._id, quote, includeQuote, initial]);

  // ── Recipient verification, debounced, only for addresses not yet checked ──
  useEffect(() => {
    const pending = [...to, ...cc, ...bcc].filter((e) => !(e.toLowerCase() in verification)).slice(0, 100);
    if (pending.length === 0) return;
    const timer = setTimeout(() => {
      verify({ emails: pending })
        .then((result) => {
          setVerification((prev) => {
            const next = { ...prev };
            for (const r of result.results) next[r.email.toLowerCase()] = { isValid: r.isValid, result: r.result, reason: r.reason };
            return next;
          });
        })
        .catch(() => {
          // Verification is advisory here; the send path enforces it.
        });
    }, 800);
    return () => clearTimeout(timer);
  }, [to, cc, bcc, verification, verify]);

  const allTo = useMemo(
    () => [...new Set([...to, ...selectedGroups.flatMap((g) => g.emails)])],
    [to, selectedGroups],
  );
  const invalid = [...allTo, ...cc, ...bcc].filter((e) => verification[e.toLowerCase()]?.isValid === false);
  const attachmentBytes = attachments.reduce((sum, a) => sum + a.size, 0);
  const canSend = allTo.length + cc.length + bcc.length > 0 && subject.trim().length > 0 && !sending;

  const fullBody = useCallback(
    () =>
      buildBody({
        body,
        contentType,
        signature: includeSignature ? mailbox.signature : undefined,
        quote: includeQuote ? quote : undefined,
      }),
    [body, contentType, includeSignature, mailbox.signature, includeQuote, quote],
  );

  const finish = (message: string) => {
    sent.current = true;
    draftStore.remove(draftId.current);
    if (serverDraftId) deleteServerDraft({ emailId: serverDraftId }).catch(() => {});
    haptic('success');
    toast.show({ message, icon: 'send', tone: 'success' });
    router.back();
  };

  const payload = () => ({
    mailboxId: mailbox._id,
    to: allTo,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    subject,
    body: fullBody(),
    attachments: attachments.length ? attachments.map(({ filename, contentType: ct, data }) => ({ filename, contentType: ct, data })) : undefined,
  });

  const doSend = async () => {
    if (!canSend) return;
    if (attachmentBytes > MAX_ATTACHMENT_BYTES) {
      setError(`Attachments total ${bytes(attachmentBytes)}. The limit for sending from the app is ${bytes(MAX_ATTACHMENT_BYTES)}.`);
      return;
    }
    setSending('send');
    setError(null);
    try {
      await sendEmail(payload());
      finish('Message sent');
    } catch (err) {
      haptic('error');
      setError(errorMessage(err, 'Failed to send email. Please try again.'));
    } finally {
      setSending(null);
    }
  };

  const confirmAndSend = () => {
    if (invalid.length > 0 && prefs.confirmSend) {
      Alert.alert(
        'Some addresses look invalid',
        `${invalid.join(', ')} ${invalid.length === 1 ? 'does' : 'do'} not appear to accept mail. Mailmark will skip recipients that fail verification.`,
        [
          { text: 'Edit', style: 'cancel' },
          { text: 'Send anyway', onPress: doSend },
        ],
      );
      return;
    }
    void doSend();
  };

  const doSchedule = async (at: Date) => {
    if (!canSend) return;
    if (!isInFuture(at, 60_000)) {
      setError('Choose a time at least a minute from now.');
      return;
    }
    setSending('schedule');
    setError(null);
    try {
      await scheduleEmail({ ...payload(), scheduledAt: at.getTime() });
      finish(`Scheduled for ${fullDate(at.getTime())}`);
    } catch (err) {
      haptic('error');
      setError(errorMessage(err, 'Failed to schedule email. Please try again.'));
    } finally {
      setSending(null);
    }
  };

  const openSchedule = () => {
    sheet.show({
      title: 'Send later',
      options: [
        ...schedulePresets().map((p) => ({ label: p.label, icon: 'calendar' as const, onPress: () => doSchedule(p.at) })),
        { label: 'Pick date & time…', icon: 'calendar', onPress: () => setPickerOpen(true) },
      ],
    });
  };

  const addAttachments = async (kind: 'files' | 'photos' | 'camera') => {
    try {
      const picked = kind === 'files' ? await pickFiles() : kind === 'photos' ? await pickPhotos() : await takePhoto();
      if (picked === null) {
        toast.show({ message: 'Camera access is off. Enable it in Settings to attach photos.', tone: 'error' });
        return;
      }
      if (picked.length) {
        haptic('light');
        setAttachments((prev) => [...prev, ...picked]);
      }
    } catch (err) {
      toast.show({ message: errorMessage(err, 'Could not attach that file.'), tone: 'error' });
    }
  };

  const discard = () => {
    const empty = draftStore.isEmpty({ to, cc, bcc, subject, body }) || (!body.trim() && subject === initial.subject && to.join() === initial.to.join());
    if (empty) {
      draftStore.remove(draftId.current);
      router.back();
      return;
    }
    sheet.show({
      title: 'Close this message?',
      options: [
        {
          label: 'Save draft',
          icon: 'drafts',
          onPress: () => {
            draftStore.save({
              id: draftId.current,
              mailboxId: mailbox._id,
              to,
              cc,
              bcc,
              subject,
              body,
              contentType,
              mode,
              replyToEmailId: source?._id,
              quote: includeQuote ? quote : '',
              updatedAt: Date.now(),
            });
            sent.current = true;
            toast.show({ message: attachments.length ? 'Draft saved (attachments are not kept)' : 'Draft saved', icon: 'drafts' });
            router.back();
          },
        },
        {
          label: 'Delete draft',
          icon: 'trash',
          destructive: true,
          onPress: () => {
            sent.current = true;
            draftStore.remove(draftId.current);
            router.back();
          },
        },
      ],
    });
  };

  const chooseFormat = () => {
    sheet.show({
      title: 'Message format',
      message: 'Signatures are always written in Markdown.',
      options: [
        { label: 'Plain text', icon: 'file', onPress: () => setContentType('plain') },
        { label: 'Markdown', icon: 'merge', onPress: () => setContentType('markdown') },
        { label: 'HTML', icon: 'code', onPress: () => setContentType('html') },
      ],
    });
  };

  const chooseFrom = () => {
    if (mailboxes.length < 2) return;
    sheet.show({
      title: 'Send from',
      options: mailboxes.map((m) => ({
        label: m.displayName ? `${m.displayName} <${m.fullAddress}>` : m.fullAddress,
        icon: 'at' as const,
        onPress: () => {
          setMailbox(m);
          setGroupIds([]);
        },
      })),
    });
  };

  const chooseGroup = () => {
    const available = (groups.data ?? []).filter((g) => !groupIds.includes(g._id));
    sheet.show({
      title: 'Add a sender group',
      message: available.length ? undefined : 'No groups on this mailbox yet.',
      options: [
        ...available.map((g) => ({
          label: `${g.name} (${g.emails.length})`,
          icon: 'team' as const,
          onPress: () => setGroupIds((ids) => [...ids, g._id]),
        })),
        {
          label: 'New group…',
          icon: 'add',
          onPress: () => router.push({ pathname: '/sender-group', params: { mailboxId: mailbox._id } }),
        },
      ],
    });
  };

  const title = mode === 'reply' || mode === 'replyAll' ? 'Reply' : mode === 'forward' ? 'Forward' : serverDraftId ? 'Draft' : 'New message';

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title,
          headerLeft: () => (
            <Pressable accessibilityRole="button" onPress={discard} hitSlop={10}>
              <ThemedText type="body" themeColor="accent">
                Cancel
              </ThemedText>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={confirmAndSend}
              onLongPress={openSchedule}
              style={[styles.sendButton, { backgroundColor: canSend ? theme.accent : theme.backgroundSelected }]}>
              <Icon name="send" size={16} color={canSend ? theme.accentText : theme.textMuted} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAwareScrollView
        bottomOffset={72}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        style={styles.flex}>
        <View style={styles.inner}>
          {error ? (
            <View style={[styles.error, { backgroundColor: theme.dangerSoft }]} accessibilityLiveRegion="assertive">
              <Icon name="warning" size={16} color={theme.danger} />
              <ThemedText type="small" themeColor="danger" style={styles.flex}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          <Pressable onPress={chooseFrom} style={[styles.fromRow, { borderBottomColor: theme.border }]} accessibilityRole="button">
            <ThemedText type="body" themeColor="textMuted" style={styles.label}>
              From
            </ThemedText>
            <ThemedText type="body" numberOfLines={1} style={styles.flex}>
              {mailbox.displayName ? `${mailbox.displayName} <${mailbox.fullAddress}>` : mailbox.fullAddress}
            </ThemedText>
            {mailboxes.length > 1 ? <Icon name="chevronDown" size={12} color={theme.textMuted} /> : null}
          </Pressable>

          <RecipientField
            label="To"
            value={to}
            onChange={setTo}
            groups={selectedGroups.map((g) => ({ id: g._id, name: g.name, count: g.emails.length }))}
            onRemoveGroup={(id) => setGroupIds((ids) => ids.filter((x) => x !== id))}
            suggestions={suggestions}
            verification={verification}
            autoFocus={initial.to.length === 0 && !draft}
            trailing={
              <View style={styles.fieldActions}>
                <IconButton icon="team" label="Add sender group" size={18} color={theme.textSecondary} onPress={chooseGroup} />
                {!showCcBcc ? (
                  <Pressable onPress={() => setShowCcBcc(true)} hitSlop={8} style={styles.ccToggle}>
                    <ThemedText type="small" themeColor="accent">
                      Cc/Bcc
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            }
          />
          {showCcBcc ? (
            <>
              <RecipientField label="Cc" value={cc} onChange={setCc} suggestions={suggestions} verification={verification} />
              <RecipientField label="Bcc" value={bcc} onChange={setBcc} suggestions={suggestions} verification={verification} />
            </>
          ) : null}

          <View style={[styles.subjectRow, { borderBottomColor: theme.border }]}>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Subject"
              placeholderTextColor={theme.textMuted}
              accessibilityLabel="Subject"
              returnKeyType="next"
              style={[styles.subject, { color: theme.text }]}
            />
          </View>

          <View style={styles.formatRow}>
            <Chip label={contentType === 'plain' ? 'Plain text' : contentType === 'markdown' ? 'Markdown' : 'HTML'} icon="code" onPress={chooseFormat} />
            {contentType !== 'plain' ? (
              <Chip label={preview ? 'Edit' : 'Preview'} icon={preview ? 'pencil' : 'eye'} selected={preview} onPress={() => setPreview((p) => !p)} />
            ) : null}
          </View>

          {preview && contentType !== 'plain' ? (
            <EmailBodyView html={buildBody({ body, contentType })} />
          ) : (
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              scrollEnabled={false}
              placeholder={contentType === 'markdown' ? 'Write in Markdown…' : contentType === 'html' ? '<p>Write HTML…</p>' : 'Write your message…'}
              placeholderTextColor={theme.textMuted}
              accessibilityLabel="Message body"
              textAlignVertical="top"
              autoCapitalize={contentType === 'html' ? 'none' : 'sentences'}
              autoCorrect={contentType !== 'html'}
              style={[styles.body, { color: theme.text, fontFamily: contentType === 'plain' ? Fonts.sans : Fonts.mono }]}
            />
          )}

          {attachments.length > 0 ? (
            <View style={styles.attachments}>
              {attachments.map((a) => (
                <Chip
                  key={a.id}
                  label={`${a.filename} · ${bytes(a.size)}`}
                  icon="attach"
                  onRemove={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                />
              ))}
              <ThemedText type="caption" themeColor={attachmentBytes > MAX_ATTACHMENT_BYTES ? 'danger' : 'textMuted'}>
                {bytes(attachmentBytes)} of {bytes(MAX_ATTACHMENT_BYTES)}
              </ThemedText>
            </View>
          ) : null}

          {mailbox.signature ? (
            <View style={[styles.option, { borderColor: theme.border }]}>
              <View style={styles.flex}>
                <ThemedText type="smallStrong">Signature</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                  {mailbox.signature}
                </ThemedText>
              </View>
              <Switch
                value={includeSignature}
                onValueChange={setIncludeSignature}
                trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                accessibilityLabel="Include signature"
              />
            </View>
          ) : null}

          {quote ? (
            <View style={[styles.option, { borderColor: theme.border }]}>
              <View style={styles.flex}>
                <ThemedText type="smallStrong">{mode === 'forward' ? 'Forwarded message' : 'Quoted message'}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {source ? `${source.from} · ${fullDate(source.date)}` : 'Included below your message'}
                </ThemedText>
              </View>
              <Switch
                value={includeQuote}
                onValueChange={setIncludeQuote}
                trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
                accessibilityLabel="Include quoted message"
              />
            </View>
          ) : null}

          {!subject.trim() && allTo.length > 0 ? (
            <ThemedText type="caption" themeColor="textMuted">
              Add a subject to send.
            </ThemedText>
          ) : null}
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View
          style={[
            styles.toolbar,
            { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.two) },
          ]}>
          <IconButton icon="attach" label="Attach files" color={theme.textSecondary} onPress={() => addAttachments('files')} />
          <IconButton icon="photo" label="Attach photos" color={theme.textSecondary} onPress={() => addAttachments('photos')} />
          {Platform.OS !== 'web' ? (
            <IconButton icon="camera" label="Take a photo" color={theme.textSecondary} onPress={() => addAttachments('camera')} />
          ) : null}
          <IconButton icon="calendar" label="Send later" color={theme.textSecondary} disabled={!canSend} onPress={openSchedule} />
          <View style={styles.flex} />
          <Button
            title={sending === 'schedule' ? 'Scheduling' : 'Send'}
            icon="send"
            size="sm"
            loading={sending !== null}
            disabled={!canSend}
            onPress={confirmAndSend}
          />
        </View>
      </KeyboardStickyView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={[styles.pickerBackdrop, { backgroundColor: theme.overlay }]} onPress={() => setPickerOpen(false)} />
        <View style={[styles.pickerSheet, { backgroundColor: theme.surfaceRaised, paddingBottom: insets.bottom + Spacing.four }]}>
          <ThemedText type="heading">Send later</ThemedText>
          <DateTimePicker
            value={customDate}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={minimumDate}
            accentColor={theme.accent}
            onValueChange={(_, date) => setCustomDate(date)}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {fullDate(customDate.getTime())}
          </ThemedText>
          <Button
            title="Schedule"
            icon="calendar"
            fullWidth
            onPress={() => {
              setPickerOpen(false);
              void doSchedule(customDate);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centerText: {
    textAlign: 'center',
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: Spacing.eight,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginTop: Spacing.two,
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    width: 44,
  },
  fieldActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ccToggle: {
    paddingTop: 10,
  },
  subjectRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subject: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 17,
    paddingVertical: Spacing.three,
  },
  formatRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 220,
    paddingVertical: Spacing.two,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.two,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  pickerSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.five,
    gap: Spacing.three,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
});
