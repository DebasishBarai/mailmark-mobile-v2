import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Skeleton } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Email } from '@/lib/convex/types';
import { displayName, normalizeSubject, rawEmail, type NameMaps } from '@/lib/email/address';
import { listDate } from '@/lib/format';

import { emailHref } from './use-email';

const WINDOW = 100;

/**
 * Other messages in the same conversation.
 *
 * Mailmark stores messages flat and outgoing mail carries no In-Reply-To, so
 * there is no server-side thread to read. The conversation is assembled the
 * way a person would: the mailbox's most recent inbox and sent mail with the
 * same subject (ignoring Re:/Fwd:) and at least one shared participant.
 */
export function useConversation(email: Email | null | undefined): { messages: Email[]; loading: boolean } {
  const args = email ? { mailboxId: email.mailboxId, paginationOpts: { numItems: WINDOW, cursor: null } } : null;
  const inbox = useLiveQuery(api.emails.listByFolderPaginated, args ? { ...args, folder: 'inbox' } : 'skip');
  const sent = useLiveQuery(api.emails.listByFolderPaginated, args ? { ...args, folder: 'sent' } : 'skip');

  const messages = useMemo(() => {
    if (!email) return [];
    const subject = normalizeSubject(email.subject);
    if (!subject) return [];
    const people = new Set([email.from, ...email.to, ...(email.cc ?? [])].map((a) => rawEmail(a).toLowerCase()));
    const all = [...(inbox.data?.page ?? []), ...(sent.data?.page ?? [])];
    return all
      .filter((m) => m._id !== email._id && normalizeSubject(m.subject) === subject)
      .filter((m) => [m.from, ...m.to, ...(m.cc ?? [])].some((a) => people.has(rawEmail(a).toLowerCase())))
      .sort((a, b) => a.date - b.date);
  }, [email, inbox.data, sent.data]);

  return { messages, loading: inbox.status === 'loading' || sent.status === 'loading' };
}

export function ConversationList({ current, messages, loading, names }: { current: Email; messages: Email[]; loading: boolean; names: NameMaps }) {
  const theme = useTheme();
  if (loading) {
    return (
      <View style={styles.list}>
        <Skeleton height={56} />
      </View>
    );
  }
  if (messages.length === 0) return null;

  const all = [...messages, current].sort((a, b) => a.date - b.date);

  return (
    <View style={styles.list}>
      <ThemedText type="label" themeColor="textSecondary">
        Conversation · {all.length} messages
      </ThemedText>
      {all.map((m) => {
        const isCurrent = m._id === current._id;
        const outgoing = m.folder === 'sent';
        return (
          <Pressable
            key={m._id}
            accessibilityRole="button"
            disabled={isCurrent}
            accessibilityLabel={`${outgoing ? 'You' : displayName(m.from, names)}, ${listDate(m.date)}`}
            onPress={() => router.push(emailHref(m))}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: isCurrent ? theme.accentSoft : pressed ? theme.backgroundSelected : theme.surfaceRaised,
                borderColor: isCurrent ? theme.accent : theme.border,
                marginLeft: outgoing ? Spacing.five : 0,
                marginRight: outgoing ? 0 : Spacing.five,
              },
            ]}>
            <Avatar name={displayName(m.from, names)} size={28} />
            <View style={styles.text}>
              <View style={styles.line}>
                <ThemedText type="smallStrong" numberOfLines={1} style={styles.flex}>
                  {outgoing ? 'You' : displayName(m.from, names)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {listDate(m.date)}
                </ThemedText>
              </View>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {isCurrent ? 'This message' : m.snippet || m.subject}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
