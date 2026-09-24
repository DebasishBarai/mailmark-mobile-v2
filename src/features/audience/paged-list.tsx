import type { ReactElement, ReactNode } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, ListSkeleton, LoadingState, type IconName } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LivePaginated } from '@/lib/convex/hooks';

/** A paginated, pull-to-refresh list with the standard loading/error/empty states. */
export function PagedList<T extends { _id: string }>({
  page,
  items,
  header,
  renderItem,
  empty,
  refreshing,
  onRefresh,
}: {
  page: LivePaginated<T>;
  items?: T[];
  header?: ReactElement;
  renderItem: (item: T) => ReactNode;
  empty: { icon: IconName; title: string; description?: string };
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const theme = useTheme();
  if (page.status === 'loading') {
    return (
      <View style={styles.fill}>
        {header}
        <ListSkeleton avatar={false} />
      </View>
    );
  }
  if (page.status === 'error' && page.items.length === 0) return <ErrorState error={page.error} onRetry={onRefresh} />;
  return (
    <FlatList<T>
      data={items ?? page.items}
      keyExtractor={(i) => i._id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      keyboardDismissMode="on-drag"
      ListHeaderComponent={header}
      renderItem={({ item }) => <>{renderItem(item)}</>}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
      onEndReachedThreshold={0.5}
      onEndReached={() => page.canLoadMore && page.loadMore()}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      ListEmptyComponent={<EmptyState {...empty} />}
      ListFooterComponent={page.isLoadingMore ? <LoadingState /> : <View style={{ height: Spacing.eight }} />}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four,
  },
});
