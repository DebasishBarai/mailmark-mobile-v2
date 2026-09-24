import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Icon } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Email } from '@/lib/convex/types';
import { displayName, type NameMaps } from '@/lib/email/address';
import { listDate, timeUntil } from '@/lib/format';

import { DeliveryIndicator } from './delivery-status';

export type EmailRowProps = {
  email: Email;
  names: NameMaps;
  onPress: (email: Email) => void;
  onLongPress: (email: Email) => void;
};

/**
 * One message in a list. Inbox rows lead with the sender; Sent, Outbox and
 * Drafts rows lead with the recipients, as the website's list does.
 */
export const EmailRow = memo(function EmailRow({ email, names, onPress, onLongPress }: EmailRowProps) {
  const theme = useTheme();
  const outgoing = email.folder === 'sent' || email.folder === 'outbox' || email.folder === 'drafts';
  const unread = email.folder === 'inbox' && !email.read;
  const who = outgoing
    ? email.to.length > 0
      ? `To: ${email.to.map((a) => displayName(a, names)).join(', ')}`
      : 'No recipients'
    : displayName(email.from, names);
  const avatarName = outgoing ? displayName(email.to[0] ?? '?', names) : displayName(email.from, names);
  const when = email.folder === 'outbox' && email.scheduledAt ? timeUntil(email.scheduledAt) : listDate(email.date);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${who}. ${email.subject || 'No subject'}. ${when}`}
      accessibilityHint="Opens the message. Long press for more actions."
      onPress={() => onPress(email)}
      onLongPress={() => onLongPress(email)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
      ]}>
      <View style={styles.leading}>
        {unread ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : <View style={styles.dotSpace} />}
        <Avatar name={avatarName} size={40} />
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <ThemedText type={unread ? 'bodyStrong' : 'body'} numberOfLines={1} style={styles.flex}>
            {who}
          </ThemedText>
          {email.starred ? <Icon name="star" size={12} color={theme.warning} /> : null}
          {email.hasAttachments ? <Icon name="attach" size={12} color={theme.textMuted} /> : null}
          <ThemedText type="caption" themeColor={unread ? 'accent' : 'textMuted'}>
            {when}
          </ThemedText>
        </View>
        <View style={styles.line}>
          <ThemedText
            type={unread ? 'smallStrong' : 'small'}
            themeColor={unread ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.flex}>
            {email.subject || '(no subject)'}
          </ThemedText>
          {outgoing ? <DeliveryIndicator email={email} /> : null}
        </View>
        {email.snippet ? (
          <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
            {email.snippet}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingRight: Spacing.four,
    paddingLeft: Spacing.two,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSpace: {
    width: 8,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
