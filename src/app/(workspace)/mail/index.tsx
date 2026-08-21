import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThreadRow } from '@/components/mail/thread-row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, Icon, Segmented, type SegmentedOption } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import type { MailFolder } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

const FOLDERS: { value: MailFolder; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'sent', label: 'Sent' },
  { value: 'outbox', label: 'Outbox' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'trash', label: 'Trash' },
];

const ALL_MAILBOXES = 'all';

export default function MailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { threads, mailboxes, toggleStar } = useWorkspace();

  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [mailboxId, setMailboxId] = useState<string>(ALL_MAILBOXES);
  const [query, setQuery] = useState('');

  const folderOptions = useMemo<SegmentedOption<MailFolder>[]>(
    () =>
      FOLDERS.map((item) => ({
        ...item,
        count: threads.filter(
          (thread) =>
            thread.folder === item.value &&
            (mailboxId === ALL_MAILBOXES || thread.mailboxId === mailboxId),
        ).length,
      })),
    [threads, mailboxId],
  );

  const mailboxOptions = useMemo<SegmentedOption<string>[]>(
    () => [
      { value: ALL_MAILBOXES, label: 'All products' },
      ...mailboxes.map((mailbox) => ({
        value: mailbox.id,
        label: mailbox.address,
        count: mailbox.unread || undefined,
      })),
    ],
    [mailboxes],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return threads
      .filter((thread) => thread.folder === folder)
      .filter((thread) => mailboxId === ALL_MAILBOXES || thread.mailboxId === mailboxId)
      .filter((thread) =>
        needle
          ? [thread.subject, thread.preview, thread.correspondent, thread.correspondentAddress]
              .join(' ')
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }, [threads, folder, mailboxId, query]);

  const addressFor = (id: string) => mailboxes.find((mailbox) => mailbox.id === id)?.address;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Mail',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compose"
              hitSlop={10}
              onPress={() => router.push('/compose')}>
              <Icon name="compose" size={20} color={theme.accent} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.controls}>
        <View style={[styles.search, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
          <Icon name="search" size={15} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search across all products"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}>
              <Icon name="close" size={14} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Segmented options={mailboxOptions} value={mailboxId} onChange={setMailboxId} scrollable />
        <Segmented options={folderOptions} value={folder} onChange={setFolder} scrollable />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(thread) => thread.id}
        contentContainerStyle={visible.length === 0 ? styles.emptyContent : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={folder === 'inbox' ? 'inbox' : 'mail'}
            title={query ? 'No matching mail' : `Nothing in ${folder}`}
            description={
              query
                ? 'Search runs across every product’s mail — try a different term.'
                : 'When a user replies it lands here, tagged with the mailbox it arrived at.'
            }
          />
        }
        renderItem={({ item }) => (
          <ThreadRow
            thread={item}
            mailboxAddress={addressFor(item.mailboxId)}
            showMailbox={mailboxId === ALL_MAILBOXES}
            onPress={() => router.push(`/mail/${item.id}`)}
            onToggleStar={() => toggleStar(item.id)}
          />
        )}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compose a new email"
        onPress={() => router.push('/compose')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: pressed ? theme.accentPressed : theme.accent },
        ]}>
        <Icon name="compose" size={20} color={theme.accentText} />
        <ThemedText type="smallStrong" color={theme.accentText}>
          Compose
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  controls: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 15,
    height: '100%',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
});
