import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useMutation } from 'convex/react';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import {
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  ListSkeleton,
  LoadingState,
  SearchField,
  SwipeRow,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useLocalDrafts, type LocalDraft } from '@/features/compose/drafts';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLivePaginated, useRefreshKey } from '@/lib/convex/hooks';
import type { Email, Mailbox } from '@/lib/convex/types';
import { listDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

import { BatchRow } from './batch-row';
import { EmailRow } from './email-row';
import { FOLDERS, folderLabel, type MailFolder } from './folders';
import { emailHref } from './use-email';
import { useEmailActions } from './use-email-actions';
import { useNameMaps } from './use-names';

const PAGE = 40;

export function InboxScreen() {
  const theme = useTheme();
  const { mailboxes, mailbox, folder, unreadByMailbox } = useWorkspace();
  const { key, refreshing, refresh } = useRefreshKey();
  const [search, setSearch] = useState('');
  const sheet = useActionSheet();
  const toast = useToast();
  const markAllAsRead = useMutation(api.emails.markAllAsRead);

  const unread = mailbox ? (unreadByMailbox[mailbox._id] ?? 0) : 0;

  const openMenu = () => {
    if (!mailbox) return;
    sheet.show({
      title: mailbox.fullAddress,
      options: [
        ...(unread > 0
          ? [
              {
                label: `Mark all ${unread} as read`,
                icon: 'markRead' as const,
                onPress: async () => {
                  try {
                    await markAllAsRead({ mailboxId: mailbox._id });
                    haptic('success');
                    toast.show({ message: 'Inbox marked as read', icon: 'check' });
                  } catch (err) {
                    toast.show({ message: errorMessage(err), tone: 'error' });
                  }
                },
              },
            ]
          : []),
        { label: 'New campaign', icon: 'campaign', onPress: () => router.push({ pathname: '/campaign-new', params: { mailboxId: mailbox._id } }) },
        { label: 'Mailbox settings', icon: 'settings', onPress: () => router.push(`/mailbox-settings/${mailbox._id}`) },
      ],
    });
  };

  const header = (
    <Stack.Screen
      options={{
        headerTitle: () => <MailboxTitle mailbox={mailbox} folder={folder} />,
        headerRight: () => (
          <View style={styles.headerButtons}>
            {mailbox ? <IconButton icon="more" label="Mailbox actions" onPress={openMenu} color={theme.accent} /> : null}
            {Platform.OS !== 'android' && mailbox ? (
              <IconButton
                icon="compose"
                label="New message"
                color={theme.accent}
                onPress={() => router.push({ pathname: '/compose', params: { mailboxId: mailbox._id } })}
              />
            ) : null}
          </View>
        ),
        headerSearchBarOptions:
          Platform.OS === 'web'
            ? undefined
            : {
                placeholder: `Search ${folderLabel(folder)}`,
                onChangeText: (e) => setSearch(e.nativeEvent.text),
                onCancelButtonPress: () => setSearch(''),
                hideWhenScrolling: true,
                tintColor: theme.accent,
              },
      }}
    />
  );

  if (mailboxes.status === 'loading') {
    return (
      <>
        {header}
        <ListSkeleton />
      </>
    );
  }
  if (mailboxes.status === 'error') {
    return (
      <>
        {header}
        <ErrorState error={mailboxes.error} onRetry={refresh} />
      </>
    );
  }
  if (!mailbox) {
    return (
      <>
        {header}
        <EmptyState
          icon="at"
          title="No mailboxes yet"
          description="Add a domain and create a mailbox on it to start sending and receiving mail."
          actionLabel="Set up a domain"
          onAction={() => router.push('/domains')}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <MailList
        key={`${mailbox._id}:${folder}:${key}`}
        mailbox={mailbox}
        folder={folder}
        search={search}
        onSearch={setSearch}
        refreshing={refreshing}
        onRefresh={refresh}
      />
      {Platform.OS === 'android' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New message"
          onPress={() => router.push({ pathname: '/compose', params: { mailboxId: mailbox._id } })}
          style={({ pressed }) => [styles.fab, { backgroundColor: pressed ? theme.accentPressed : theme.accent }]}>
          <Icon name="compose" size={22} color={theme.accentText} />
          <ThemedText type="bodyStrong" color={theme.accentText}>
            Compose
          </ThemedText>
        </Pressable>
      ) : null}
    </>
  );
}

function MailboxTitle({ mailbox, folder }: { mailbox: Mailbox | null; folder: MailFolder }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${folderLabel(folder)}, ${mailbox?.fullAddress ?? ''}. Switch mailbox or folder`}
      onPress={() => {
        haptic('selection');
        router.push('/mailbox-picker');
      }}
      hitSlop={8}
      style={styles.title}>
      <View style={styles.titleLine}>
        <ThemedText type="subheading">{folderLabel(folder)}</ThemedText>
        <Icon name="chevronDown" size={12} color={theme.accent} />
      </View>
      {mailbox ? (
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {mailbox.fullAddress}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

type Item =
  | { kind: 'email'; key: string; email: Email }
  | { kind: 'batch'; key: string; batchId: string; emails: Email[] }
  | { kind: 'draft'; key: string; draft: LocalDraft };

function MailList({
  mailbox,
  folder,
  search,
  onSearch,
  refreshing,
  onRefresh,
}: {
  mailbox: Mailbox;
  folder: MailFolder;
  search: string;
  onSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const theme = useTheme();
  const list = useLivePaginated(api.emails.listByFolderPaginated, { mailboxId: mailbox._id, folder }, PAGE);
  const drafts = useLocalDrafts(folder === 'drafts' ? mailbox._id : '__none__');
  const names = useNameMaps(list.items);
  const actions = useEmailActions();

  const items = useMemo<Item[]>(() => {
    const term = search.trim().toLowerCase();
    const matches = (e: Email) =>
      !term ||
      e.subject.toLowerCase().includes(term) ||
      e.snippet.toLowerCase().includes(term) ||
      e.from.toLowerCase().includes(term) ||
      e.to.join(' ').toLowerCase().includes(term);

    const out: Item[] = [];
    if (folder === 'drafts') {
      for (const d of drafts) {
        if (!term || d.subject.toLowerCase().includes(term) || d.to.join(' ').toLowerCase().includes(term)) {
          out.push({ kind: 'draft', key: d.id, draft: d });
        }
      }
    }
    if (folder === 'sent' || folder === 'outbox') {
      const groups = new Map<string, Email[]>();
      const order: string[] = [];
      for (const e of list.items) {
        const k = e.batchId ?? `solo-${e._id}`;
        if (!groups.has(k)) {
          groups.set(k, []);
          order.push(k);
        }
        groups.get(k)!.push(e);
      }
      for (const k of order) {
        const group = groups.get(k)!;
        if (!group.some(matches)) continue;
        if (group.length > 1 && group[0].batchId) out.push({ kind: 'batch', key: k, batchId: group[0].batchId, emails: group });
        else for (const e of group) out.push({ kind: 'email', key: e._id, email: e });
      }
    } else {
      for (const e of list.items) if (matches(e)) out.push({ kind: 'email', key: e._id, email: e });
    }
    return out;
  }, [list.items, drafts, folder, search]);

  const openEmail = useCallback((email: Email) => {
    haptic('selection');
    if (email.folder === 'drafts') {
      router.push({ pathname: '/compose', params: { mailboxId: email.mailboxId, fromEmailId: email._id, folder: 'drafts' } });
    } else {
      router.push(emailHref(email));
    }
  }, []);

  const openBatch = useCallback((batchId: string) => {
    router.push(`/campaign/${encodeURIComponent(batchId)}`);
  }, []);

  const renderItem = ({ item }: { item: Item }) => {
    if (item.kind === 'batch') return <BatchRow batchId={item.batchId} emails={item.emails} onPress={openBatch} />;
    if (item.kind === 'draft') return <DraftRow draft={item.draft} />;
    const email = item.email;
    if (folder === 'trash') {
      return (
        <SwipeRow leading={{ label: 'Restore', icon: 'inbox', color: theme.info, onPress: () => actions.restore(email) }}>
          <EmailRow email={email} names={names} onPress={openEmail} onLongPress={actions.showMenu} />
        </SwipeRow>
      );
    }
    if (folder === 'outbox') {
      return (
        <SwipeRow
          trailing={[{ label: 'Cancel', icon: 'stop', color: theme.danger, onPress: () => actions.cancelSchedule(email) }]}>
          <EmailRow email={email} names={names} onPress={openEmail} onLongPress={actions.showMenu} />
        </SwipeRow>
      );
    }
    return (
      <SwipeRow
        leading={
          folder === 'inbox'
            ? {
                label: email.read ? 'Unread' : 'Read',
                icon: email.read ? 'markUnread' : 'markRead',
                color: theme.info,
                onPress: () => actions.setRead(email, !email.read),
              }
            : undefined
        }
        trailing={[
          { label: 'Trash', icon: 'trash', color: theme.danger, onPress: () => actions.trash(email) },
          { label: email.starred ? 'Unstar' : 'Star', icon: 'star', color: theme.warning, onPress: () => actions.toggleStar(email) },
        ]}>
        <EmailRow email={email} names={names} onPress={openEmail} onLongPress={actions.showMenu} />
      </SwipeRow>
    );
  };

  const listHeader = Platform.OS === 'web' ? (
    <View style={styles.webSearch}>
      <SearchField value={search} onChangeText={onSearch} placeholder={`Search ${folderLabel(folder)}`} />
    </View>
  ) : null;

  if (list.status === 'loading') return <ListSkeleton />;
  if (list.status === 'error' && list.items.length === 0) return <ErrorState error={list.error} onRetry={onRefresh} />;

  const folderMeta = FOLDERS.find((f) => f.key === folder)!;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={listHeader}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (list.canLoadMore) list.loadMore();
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />
      }
      ListEmptyComponent={
        search ? (
          <EmptyState
            icon="search"
            title="No matches"
            description={
              list.canLoadMore
                ? `Nothing in the ${list.items.length} most recent messages matches "${search}". Scroll the full list to load older mail.`
                : `Nothing in ${folderLabel(folder)} matches "${search}".`
            }
          />
        ) : (
          <EmptyState icon={folderMeta.icon} title={`${folderMeta.label} is empty`} description={folderMeta.description} />
        )
      }
      ListFooterComponent={
        list.isLoadingMore ? <LoadingState /> : items.length > 0 ? <View style={styles.footer} /> : null
      }
    />
  );
}

function DraftRow({ draft }: { draft: LocalDraft }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Draft: ${draft.subject || 'No subject'}`}
      onPress={() => router.push({ pathname: '/compose', params: { mailboxId: draft.mailboxId, draftId: draft.id } })}
      style={({ pressed }) => [styles.draft, { backgroundColor: pressed ? theme.backgroundSelected : theme.background }]}>
      <View style={[styles.draftIcon, { backgroundColor: theme.warningSoft }]}>
        <Icon name="pencil" size={16} color={theme.warning} />
      </View>
      <View style={styles.flex}>
        <View style={styles.titleLine}>
          <ThemedText type="bodyStrong" themeColor="warning" style={styles.flex} numberOfLines={1}>
            Draft{draft.to.length ? ` to ${draft.to.join(', ')}` : ''}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {listDate(draft.updatedAt)}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {draft.subject || '(no subject)'}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          Saved on this device
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    alignItems: 'center',
    maxWidth: 240,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
  },
  footer: {
    height: Spacing.eight,
  },
  webSearch: {
    padding: Spacing.three,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    height: 56,
    borderRadius: Radius.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  draft: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'flex-start',
  },
  draftIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  flex: {
    flex: 1,
  },
});
