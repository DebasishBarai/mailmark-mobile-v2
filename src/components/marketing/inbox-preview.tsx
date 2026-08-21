import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAILBOXES = ['hello@app-one.com', 'support@app-two.io', 'team@app-three.co'];

const ROWS = [
  { from: 'John Smith', time: '2m', subject: 'Re: Partnership proposal', preview: "Sounds great, let's schedule a call..." },
  { from: 'Emily Davis', time: '1h', subject: 'Campaign results Q4', preview: 'Here are the numbers from last...' },
  { from: 'Alex Turner', time: '3h', subject: 'Invoice #1042', preview: 'Please find attached the invoice...' },
  { from: 'Campaign: v2.0 is live', time: '5h', subject: 'Sent to 1,284 users on app-one.com', preview: 'Open rate: 42% · Click rate: 12%...' },
];

/**
 * The dashboard still-life from the top of mailmark.dev, rebuilt at phone width:
 * every product's mail in one list, tagged by the mailbox it landed in.
 */
export function InboxPreview() {
  const theme = useTheme();

  return (
    <View style={[styles.frame, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
      <View style={[styles.chrome, { borderBottomColor: theme.border }]}>
        <ThemedText type="caption" themeColor="textMuted">
          Mailmark | all your products
        </ThemedText>
        <View style={[styles.unreadPill, { backgroundColor: theme.accent }]}>
          <ThemedText type="caption" color={theme.accentText}>
            12
          </ThemedText>
        </View>
      </View>

      <View style={styles.mailboxRow}>
        {MAILBOXES.map((address) => (
          <View key={address} style={[styles.mailboxChip, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {address}
            </ThemedText>
          </View>
        ))}
      </View>

      {ROWS.map((row, index) => (
        <View
          key={row.subject}
          style={[
            styles.row,
            index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
          ]}>
          <View style={[styles.dot, { backgroundColor: index < 2 ? theme.accent : 'transparent' }]} />
          <View style={styles.rowBody}>
            <View style={styles.rowHeader}>
              <ThemedText type="smallStrong" numberOfLines={1} style={styles.rowFrom}>
                {row.from}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                {row.time}
              </ThemedText>
            </View>
            <ThemedText type="small" numberOfLines={1}>
              {row.subject}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
              {row.preview}
            </ThemedText>
          </View>
        </View>
      ))}

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Icon name="compose" size={13} color={theme.accent} />
        <ThemedText type="caption" themeColor="accent">
          Compose
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unreadPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  mailboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowFrom: {
    flex: 1,
  },
  mailboxChip: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
