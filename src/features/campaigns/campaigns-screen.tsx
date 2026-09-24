import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, EmptyState, ErrorState, IconButton, ListSkeleton, LoadingState, Segmented } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { useLiveQuery, useRefreshKey } from '@/lib/convex/hooks';
import type { Sequence } from '@/lib/convex/types';

import { CampaignCard } from './campaign-card';
import { useCampaignIndex, type Campaign } from './campaign-index';
import { SequenceCard } from './sequence-card';

type Tab = 'campaigns' | 'followups';

export function CampaignsScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('campaigns');
  const { key, refreshing, refresh } = useRefreshKey();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton icon="add" label="New campaign" color={theme.accent} onPress={() => router.push('/campaign-new')} />
          ),
        }}
      />
      {tab === 'campaigns' ? (
        <CampaignList key={key} tab={tab} onTab={setTab} refreshing={refreshing} onRefresh={refresh} />
      ) : (
        <SequenceList key={key} tab={tab} onTab={setTab} refreshing={refreshing} onRefresh={refresh} />
      )}
    </>
  );
}

function Header({ tab, onTab, counts }: { tab: Tab; onTab: (t: Tab) => void; counts: [number?, number?] }) {
  return (
    <View style={styles.header}>
      <Segmented
        value={tab}
        onChange={onTab}
        options={[
          { value: 'campaigns', label: 'Campaigns', count: counts[0] },
          { value: 'followups', label: 'Follow-ups', count: counts[1] },
        ]}
      />
    </View>
  );
}

type ListProps = { tab: Tab; onTab: (t: Tab) => void; refreshing: boolean; onRefresh: () => void };

function CampaignList({ tab, onTab, refreshing, onRefresh }: ListProps) {
  const theme = useTheme();
  const index = useCampaignIndex();

  if (index.loading && index.campaigns.length === 0) {
    return (
      <View style={styles.fill}>
        <Header tab={tab} onTab={onTab} counts={[]} />
        <ListSkeleton avatar={false} rows={5} />
      </View>
    );
  }
  if (index.error && index.campaigns.length === 0) return <ErrorState error={index.error} onRetry={onRefresh} />;

  return (
    <FlatList<Campaign>
      data={index.campaigns}
      keyExtractor={(c) => c.batchId}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      ListHeaderComponent={<Header tab={tab} onTab={onTab} counts={[index.campaigns.length]} />}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <CampaignCard campaign={item} onPress={() => router.push(`/campaign/${encodeURIComponent(item.batchId)}`)} />
        </View>
      )}
      onEndReachedThreshold={0.4}
      onEndReached={() => index.canLoadMore && index.loadMore()}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      ListEmptyComponent={
        <EmptyState
          icon="campaign"
          title="No campaigns yet"
          description="Send one message to many people, personalised with merge fields from a CSV or Google Sheet, with automatic follow-ups."
          actionLabel="Create a campaign"
          onAction={() => router.push('/campaign-new')}
        />
      }
      ListFooterComponent={
        index.canLoadMore ? (
          <View style={styles.footer}>
            {index.loading ? <LoadingState /> : <Button title="Load older campaigns" variant="ghost" onPress={index.loadMore} />}
          </View>
        ) : index.campaigns.length > 0 ? (
          <ThemedText type="caption" themeColor="textMuted" style={styles.footerText}>
            That is every campaign on your mailboxes.
          </ThemedText>
        ) : null
      }
    />
  );
}

function SequenceList({ tab, onTab, refreshing, onRefresh }: ListProps) {
  const theme = useTheme();
  const sequences = useLiveQuery(api.sequences.listForCurrentUser, {});
  const sorted = useMemo(() => [...(sequences.data ?? [])].sort((a, b) => b.createdAt - a.createdAt), [sequences.data]);

  if (sequences.status === 'loading') {
    return (
      <View style={styles.fill}>
        <Header tab={tab} onTab={onTab} counts={[]} />
        <ListSkeleton avatar={false} rows={4} />
      </View>
    );
  }
  if (sequences.status === 'error') return <ErrorState error={sequences.error} onRetry={onRefresh} />;

  return (
    <FlatList<Sequence>
      data={sorted}
      keyExtractor={(s) => s._id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      ListHeaderComponent={<Header tab={tab} onTab={onTab} counts={[undefined, sorted.length]} />}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <SequenceCard sequence={item} onPress={() => router.push(`/sequence/${item._id}`)} />
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      ListEmptyComponent={
        <EmptyState
          icon="sequence"
          title="No follow-up sequences"
          description="Add follow-ups when you create a campaign. Mailmark sends them on schedule and stops for anyone who replies."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    paddingBottom: Spacing.three,
  },
  list: {
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  item: {
    marginBottom: Spacing.three,
  },
  footer: {
    paddingVertical: Spacing.three,
  },
  footerText: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
