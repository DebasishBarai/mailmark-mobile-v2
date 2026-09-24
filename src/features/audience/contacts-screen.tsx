import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, ListRow, ProgressBar, SearchField, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/convex/api';
import { useLivePaginated, useLiveQuery, useRefreshKey } from '@/lib/convex/hooks';
import type { Contact, Recipient } from '@/lib/convex/types';
import { shortDate } from '@/lib/format';

import { PagedList } from './paged-list';

type Tab = 'contacts' | 'recipients';

/**
 * The website's Contacts page: people who wrote to you (the address book) and
 * everyone you have sent to (recipients, which count toward the plan).
 */
export function ContactsScreen() {
  const [tab, setTab] = useState<Tab>('contacts');
  const { key, refreshing, refresh } = useRefreshKey();
  const [search, setSearch] = useState('');
  const usage = useLiveQuery(api.quotas.getUsageAndLimits, {});

  const header = (
    <View style={styles.header}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'contacts', label: 'Contacts' }, { value: 'recipients', label: 'Recipients' }]} />
      {tab === 'recipients' && usage.data ? (
        <View style={styles.usage}>
          <ThemedText type="small" themeColor="textSecondary">
            {usage.data.usage.recipients.toLocaleString()} of {usage.data.limits.recipients.toLocaleString()} unique recipients on your plan
          </ThemedText>
          <ProgressBar value={usage.data.usage.recipients / usage.data.limits.recipients} />
        </View>
      ) : null}
      {tab === 'contacts' && usage.data ? (
        <ThemedText type="small" themeColor="textSecondary">
          {usage.data.usage.contacts.toLocaleString()} contacts learned from mail you received
        </ThemedText>
      ) : null}
      <SearchField value={search} onChangeText={setSearch} placeholder="Search loaded addresses" />
    </View>
  );

  return tab === 'contacts' ? (
    <ContactList key={`c${key}`} header={header} search={search} refreshing={refreshing} onRefresh={refresh} />
  ) : (
    <RecipientList key={`r${key}`} header={header} search={search} refreshing={refreshing} onRefresh={refresh} />
  );
}

type ListProps = { header: React.ReactElement; search: string; refreshing: boolean; onRefresh: () => void };

function ContactList({ header, search, refreshing, onRefresh }: ListProps) {
  const page = useLivePaginated(api.contacts.listPageForCurrentUser, {}, 50);
  const term = search.trim().toLowerCase();
  const items = useMemo(() => (term ? page.items.filter((c) => c.email.includes(term) || c.name.toLowerCase().includes(term)) : page.items), [page.items, term]);
  return (
    <PagedList<Contact>
      page={page}
      items={items}
      header={header}
      refreshing={refreshing}
      onRefresh={onRefresh}
      empty={{ icon: 'team', title: term ? 'No matches' : 'No contacts yet', description: term ? undefined : 'Names are learned from people who email your mailboxes.' }}
      renderItem={(c) => (
        <ListRow
          title={c.name || c.email}
          subtitle={c.email}
          left={<Avatar name={c.name || c.email} size={36} />}
          onPress={() => router.push({ pathname: '/compose', params: { to: c.email } })}
          accessibilityHint="Write a message"
        />
      )}
    />
  );
}

function RecipientList({ header, search, refreshing, onRefresh }: ListProps) {
  const page = useLivePaginated(api.recipients.listForCurrentUser, {}, 50);
  const term = search.trim().toLowerCase();
  const items = useMemo(() => (term ? page.items.filter((r) => r.email.includes(term)) : page.items), [page.items, term]);
  return (
    <PagedList<Recipient>
      page={page}
      items={items}
      header={header}
      refreshing={refreshing}
      onRefresh={onRefresh}
      empty={{ icon: 'send', title: term ? 'No matches' : 'No recipients yet', description: term ? undefined : 'Everyone you send to appears here.' }}
      renderItem={(r) => (
        <ListRow title={r.email} subtitle={`First sent ${shortDate(r.firstSeenAt)}`} icon="at" onPress={() => router.push({ pathname: '/compose', params: { to: r.email } })} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  usage: {
    gap: Spacing.two,
  },
});
