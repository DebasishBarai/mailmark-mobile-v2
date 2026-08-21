import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Field, Icon, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

export default function ComposeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { mailboxes, sendMail } = useWorkspace();

  const [mailboxId, setMailboxId] = useState(mailboxes[0]?.id ?? '');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const mailbox = mailboxes.find((item) => item.id === mailboxId);
  const canSend = to.trim().length > 0 && body.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    sendMail({ mailboxId, to: to.trim(), subject: subject.trim(), body: body.trim() });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}>
      <Screen>
        <View style={styles.header}>
          <ThemedText type="heading">New message</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => router.back()}>
            <Icon name="close" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <ThemedText type="label" themeColor="textSecondary">
            Send from
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {mailboxes.map((item) => {
              const selected = item.id === mailboxId;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setMailboxId(item.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.accent : theme.surfaceRaised,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}>
                  <ThemedText type="smallStrong" color={selected ? theme.accentText : theme.textSecondary}>
                    {item.address}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.form}>
          <Field
            label="To"
            value={to}
            onChangeText={setTo}
            placeholder="user@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What is this about?" />
          <Field
            label="Message"
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Write your message…"
            hint={mailbox ? `Signed as ${mailbox.displayName} — ${mailbox.address}` : undefined}
          />

          <Button title="Send" icon="send" onPress={send} disabled={!canSend} fullWidth />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.four,
  },
  field: {
    gap: Spacing.two,
    paddingTop: Spacing.five,
  },
  chips: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  form: {
    gap: Spacing.four,
    paddingTop: Spacing.four,
  },
});
