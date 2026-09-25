import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Group, Icon, ListRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

import { FOLDERS } from './folders';

/**
 * The "Mailboxes" sheet: folders of the open mailbox, then every mailbox on
 * the account grouped by domain with its unread count. Presented as a native
 * form sheet from the Mail title.
 */
export function MailboxPickerScreen() {
  const theme = useTheme();
  const { mailbox, folder, setFolder, selectMailbox, mailboxes, domains, unreadByMailbox } = useWorkspace();

  const byDomain = (domains.data ?? [])
    .map((d) => ({ domain: d, mailboxes: (mailboxes.data ?? []).filter((m) => m.domainId === d._id) }))
    .filter((g) => g.mailboxes.length > 0);

  const close = () => router.back();

  return (
    // nestedScrollEnabled lets the Android sheet see this list, so a downward
    // drag scrolls the list back to the top before it starts closing the sheet.
    <ScrollView
      nestedScrollEnabled
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic">
      <ThemedText type="heading">Mailboxes</ThemedText>

      {mailbox ? (
        <Group title={mailbox.fullAddress}>
          {FOLDERS.map((f) => (
            <ListRow
              key={f.key}
              title={f.label}
              icon={f.icon}
              iconColor={f.key === folder ? theme.accent : undefined}
              right={
                f.key === 'inbox' && (unreadByMailbox[mailbox._id] ?? 0) > 0 ? (
                  <Badge label={String(unreadByMailbox[mailbox._id])} tone="accent" />
                ) : f.key === folder ? (
                  <Icon name="check" size={16} color={theme.accent} />
                ) : undefined
              }
              onPress={() => {
                haptic('selection');
                setFolder(f.key);
                close();
              }}
              showChevron={false}
            />
          ))}
        </Group>
      ) : null}

      {byDomain.map(({ domain, mailboxes: list }) => (
        <Group key={domain._id} title={domain.domain}>
          {list.map((m) => {
            const unread = unreadByMailbox[m._id] ?? 0;
            const active = m._id === mailbox?._id;
            return (
              <ListRow
                key={m._id}
                title={m.displayName || m.address}
                subtitle={m.fullAddress}
                icon="at"
                iconColor={active ? theme.accent : undefined}
                right={
                  <View style={styles.right}>
                    {unread > 0 ? <Badge label={String(unread)} tone="accent" /> : null}
                    {active ? <Icon name="check" size={16} color={theme.accent} /> : null}
                  </View>
                }
                onPress={() => {
                  haptic('selection');
                  selectMailbox(m._id);
                  close();
                }}
                showChevron={false}
              />
            );
          })}
        </Group>
      ))}

      <Group>
        <ListRow
          title="Manage mailboxes"
          icon="settings"
          onPress={() => {
            close();
            router.push('/mailboxes');
          }}
        />
      </Group>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.five,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
