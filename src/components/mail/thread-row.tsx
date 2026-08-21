import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Icon } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { Thread } from '@/data/types';
import { formatRelative } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

export type ThreadRowProps = {
  thread: Thread;
  mailboxAddress?: string;
  /** Hidden when the list is already filtered to a single mailbox. */
  showMailbox?: boolean;
  onPress: () => void;
  onToggleStar: () => void;
};

export function ThreadRow({
  thread,
  mailboxAddress,
  showMailbox = true,
  onPress,
  onToggleStar,
}: ThreadRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${thread.correspondent}, ${thread.subject}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <Avatar name={thread.correspondent} size={38} />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <ThemedText
            type={thread.unread ? 'bodyStrong' : 'body'}
            numberOfLines={1}
            style={styles.correspondent}>
            {thread.correspondent}
          </ThemedText>
          <ThemedText type="caption" themeColor={thread.unread ? 'accent' : 'textMuted'}>
            {formatRelative(thread.receivedAt)}
          </ThemedText>
        </View>

        <ThemedText
          type={thread.unread ? 'smallStrong' : 'small'}
          numberOfLines={1}
          themeColor={thread.unread ? 'text' : 'textSecondary'}>
          {thread.subject}
        </ThemedText>

        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {thread.preview}
        </ThemedText>

        <View style={styles.metaRow}>
          {showMailbox && mailboxAddress ? (
            <View style={[styles.mailboxTag, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {mailboxAddress}
              </ThemedText>
            </View>
          ) : null}
          {thread.hasAttachment ? <Icon name="attach" size={12} color={theme.textMuted} /> : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={thread.starred ? 'Remove star' : 'Add star'}
        hitSlop={10}
        onPress={onToggleStar}
        style={styles.star}>
        <Icon name="star" size={15} color={thread.starred ? theme.warning : theme.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  correspondent: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: 2,
  },
  mailboxTag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: 4,
    maxWidth: 200,
  },
  star: {
    paddingTop: Spacing.one,
  },
});
