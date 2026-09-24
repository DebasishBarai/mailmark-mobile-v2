import { useMutation } from 'convex/react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, Segmented } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { EmailBodyView } from '@/features/mail/email-body-view';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Id, Mailbox } from '@/lib/convex/types';
import { markdownToHtml } from '@/lib/email/compose';
import { haptic } from '@/lib/haptics';

export function SignatureScreen() {
  const { mailboxId } = useLocalSearchParams<{ mailboxId: string }>();
  const mailbox = useLiveQuery(api.mailboxes.getById, { mailboxId: mailboxId as Id<'mailboxes'> });
  if (!mailbox.data) return <LoadingState />;
  return <SignatureEditor mailbox={mailbox.data} />;
}

function SignatureEditor({ mailbox }: { mailbox: Mailbox }) {
  const theme = useTheme();
  const toast = useToast();
  const save = useMutation(api.mailboxes.updateSignature);
  const [text, setText] = useState(mailbox.signature ?? '');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [busy, setBusy] = useState(false);
  const mailboxId = mailbox._id;

  const submit = async () => {
    setBusy(true);
    try {
      await save({ mailboxId, signature: text });
      haptic('success');
      toast.show({ message: 'Signature saved', icon: 'check' });
      router.back();
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <Stack.Screen
        options={{
          title: 'Signature',
          headerRight: () => (
            <Pressable onPress={submit} disabled={busy} hitSlop={10} accessibilityRole="button">
              <ThemedText type="bodyStrong" themeColor="accent">
                {busy ? 'Saving…' : 'Save'}
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <View style={styles.inner}>
        <ThemedText type="small" themeColor="textSecondary">
          {mailbox.fullAddress}. Written in Markdown and added below a “-- ” line on messages you send.
        </ThemedText>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'edit', label: 'Edit' }, { value: 'preview', label: 'Preview' }]} />
        {tab === 'edit' ? (
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            scrollEnabled={false}
            textAlignVertical="top"
            placeholder={'**Ada Lovelace**\nFounder, Acme\n[acme.com](https://acme.com)'}
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
          />
        ) : (
          <EmailBodyView html={text.trim() ? markdownToHtml(text) : '<p style="color:#999">No signature.</p>'} />
        )}
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
    gap: Spacing.three,
  },
  input: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    minHeight: 180,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
