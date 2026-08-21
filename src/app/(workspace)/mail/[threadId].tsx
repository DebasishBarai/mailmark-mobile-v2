import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Button, Card, Divider, EmptyState, Field, Icon, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

export default function ThreadScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { threads, mailboxes, markRead, toggleStar, moveToTrash, sendMail } = useWorkspace();

  const thread = threads.find((item) => item.id === threadId);
  const mailbox = mailboxes.find((item) => item.id === thread?.mailboxId);

  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (thread?.unread) markRead(thread.id);
  }, [thread, markRead]);

  if (!thread) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ title: 'Mail' }} />
        <EmptyState icon="mail" title="This conversation is gone" description="It may have been deleted." />
      </Screen>
    );
  }

  const sendReply = () => {
    if (!reply.trim() || !mailbox) return;
    sendMail({
      mailboxId: mailbox.id,
      to: thread.correspondentAddress || thread.correspondent,
      subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
      body: reply.trim(),
    });
    setReply('');
    setReplying(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={thread.starred ? 'Remove star' : 'Add star'}
                hitSlop={10}
                onPress={() => toggleStar(thread.id)}>
                <Icon name="star" size={19} color={thread.starred ? theme.warning : theme.textMuted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Move to trash"
                hitSlop={10}
                onPress={() => {
                  moveToTrash(thread.id);
                  router.back();
                }}>
                <Icon name="trash" size={19} color={theme.textMuted} />
              </Pressable>
            </View>
          ),
        }}
      />

      <Screen>
        <ThemedText type="title" style={styles.subject}>
          {thread.subject}
        </ThemedText>

        {mailbox ? (
          <View style={[styles.mailboxTag, { backgroundColor: theme.backgroundElement }]}>
            <Icon name="inbox" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary">
              {mailbox.address}
            </ThemedText>
          </View>
        ) : null}

        <Divider style={styles.divider} />

        <View style={styles.messages}>
          {thread.messages.map((message) => (
            <Card
              key={message.id}
              tone={message.outbound ? 'flat' : 'raised'}
              style={styles.message}>
              <View style={styles.messageHeader}>
                <Avatar name={message.from} size={32} />
                <View style={styles.messageMeta}>
                  <ThemedText type="smallStrong" numberOfLines={1}>
                    {message.from}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
                    {message.fromAddress}
                  </ThemedText>
                </View>
                <ThemedText type="caption" themeColor="textMuted">
                  {formatDateTime(message.sentAt)}
                </ThemedText>
              </View>
              <ThemedText type="body">{message.body}</ThemedText>
              {message.outbound ? null : (
                <ThemedText type="caption" themeColor="textMuted">
                  Delivered to {mailbox?.address}
                </ThemedText>
              )}
            </Card>
          ))}
        </View>

        {replying ? (
          <View style={styles.replyBox}>
            <Field
              label={`Reply from ${mailbox?.address ?? ''}`}
              value={reply}
              onChangeText={setReply}
              multiline
              placeholder="Write your reply…"
              autoFocus
            />
            {mailbox?.signature ? (
              <ThemedText type="caption" themeColor="textMuted">
                {mailbox.signature}
              </ThemedText>
            ) : null}
            <View style={styles.replyActions}>
              <Button title="Send" icon="send" onPress={sendReply} disabled={!reply.trim()} />
              <Button title="Cancel" variant="ghost" onPress={() => setReplying(false)} />
            </View>
          </View>
        ) : (
          <Button
            title="Reply"
            icon="reply"
            variant="secondary"
            fullWidth
            style={styles.replyButton}
            onPress={() => setReplying(true)}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  subject: {
    paddingTop: Spacing.two,
  },
  mailboxTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    marginTop: Spacing.three,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
  },
  divider: {
    marginVertical: Spacing.four,
  },
  messages: {
    gap: Spacing.three,
  },
  message: {
    gap: Spacing.three,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  messageMeta: {
    flex: 1,
    gap: 1,
  },
  replyBox: {
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  replyActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  replyButton: {
    marginTop: Spacing.four,
  },
});
