import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Field, ListRow, Stat, SwipeRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLivePaginated, useLiveQuery, useRefreshKey } from '@/lib/convex/hooks';
import type { Id, Unsubscribe } from '@/lib/convex/types';
import { isValidEmail } from '@/lib/email/address';
import { listDate } from '@/lib/format';

import { PagedList } from './paged-list';

const SOURCE: Record<string, string> = { 'one-click': 'One-click', link: 'Unsubscribe link', manual: 'Added by you' };

export function UnsubscribesScreen() {
  const { key, refreshing, refresh } = useRefreshKey();
  return <Body key={key} refreshing={refreshing} onRefresh={refresh} />;
}

function Body({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  const sheet = useActionSheet();
  const { domains } = useWorkspace();
  const stats = useLiveQuery(api.unsubscribes.getStats, {});
  const page = useLivePaginated(api.unsubscribes.listPageForCurrentUser, {}, 50);
  const addManual = useMutation(api.unsubscribes.addManual);
  const remove = useMutation(api.unsubscribes.remove);
  const [email, setEmail] = useState('');

  const add = () => {
    const list = domains.data ?? [];
    const run = async (domainId: Id<'domains'>) => {
      try {
        await addManual({ domainId, email: email.trim() });
        setEmail('');
        toast.show({ message: 'Address unsubscribed', icon: 'check' });
      } catch (err) {
        toast.show({ message: errorMessage(err), tone: 'error' });
      }
    };
    if (list.length === 1) return run(list[0]._id);
    sheet.show({ title: 'Unsubscribe from which domain?', options: list.map((d) => ({ label: d.domain, icon: 'domain' as const, onPress: () => run(d._id) })) });
  };

  const resubscribe = (u: Unsubscribe) =>
    Alert.alert('Remove this unsubscribe?', `${u.email} will be able to receive mail from ${u.domainName} again. Only do this if they asked to be resubscribed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove({ unsubscribeId: u._id });
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
          }
        },
      },
    ]);

  const header = (
    <View style={styles.header}>
      {stats.data ? (
        <View style={styles.stats}>
          <Stat label="Total" value={stats.data.total.toLocaleString()} />
          <Stat label="Last 7 days" value={stats.data.last7Days.toLocaleString()} />
          <Stat label="Last 30 days" value={stats.data.last30Days.toLocaleString()} />
        </View>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        Mail to these addresses is skipped automatically. Every message carries one-click unsubscribe headers, as Gmail and Yahoo require.
      </ThemedText>
      <Field value={email} onChangeText={setEmail} placeholder="Unsubscribe an address…" autoCapitalize="none" keyboardType="email-address" returnKeyType="done" onSubmitEditing={() => isValidEmail(email) && add()} />
      {isValidEmail(email) ? <Button title="Add unsubscribe" size="sm" onPress={add} /> : null}
    </View>
  );

  return (
    <PagedList<Unsubscribe>
      page={page}
      header={header}
      refreshing={refreshing}
      onRefresh={onRefresh}
      empty={{ icon: 'unsubscribe', title: 'No unsubscribes', description: 'People who opt out of your mail appear here.' }}
      renderItem={(u) => (
        <SwipeRow trailing={[{ label: 'Remove', icon: 'trash', color: theme.danger, onPress: () => resubscribe(u) }]}>
          <View style={{ backgroundColor: theme.background }}>
            <ListRow title={u.email} subtitle={`${u.domainName} · ${listDate(u.unsubscribedAt)}`} right={<Badge label={SOURCE[u.source] ?? u.source} />} onLongPress={() => resubscribe(u)} />
          </View>
        </SwipeRow>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
