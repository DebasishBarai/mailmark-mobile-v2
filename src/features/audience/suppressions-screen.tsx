import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Field, ListRow, Segmented, SwipeRow, type BadgeTone } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLivePaginated, useRefreshKey } from '@/lib/convex/hooks';
import type { SendBlock, Suppression, SuppressionReason } from '@/lib/convex/types';
import { isValidEmail } from '@/lib/email/address';
import { listDate } from '@/lib/format';

import { PagedList } from './paged-list';

const REASON: Record<SuppressionReason, { label: string; tone: BadgeTone }> = {
  hard_bounce: { label: 'Hard bounce', tone: 'danger' },
  complaint: { label: 'Spam complaint', tone: 'danger' },
  manual: { label: 'Added by you', tone: 'neutral' },
  invalid: { label: 'Invalid', tone: 'warning' },
  disposable: { label: 'Disposable', tone: 'warning' },
};

const PATH: Record<SendBlock['path'], string> = { compose: 'Compose', scheduled: 'Scheduled', api: 'API', sequence: 'Follow-up' };

type Tab = 'suppressed' | 'blocked';

/**
 * The send gate's two lists: addresses Mailmark will not send to
 * (suppressions, from bounces, complaints and verification) and the log of
 * individual sends it refused (blocks), as on the website.
 */
export function SuppressionsScreen() {
  const [tab, setTab] = useState<Tab>('suppressed');
  const { key, refreshing, refresh } = useRefreshKey();
  const tabs = <Segmented value={tab} onChange={setTab} options={[{ value: 'suppressed', label: 'Suppressed' }, { value: 'blocked', label: 'Blocked sends' }]} />;
  return tab === 'suppressed' ? (
    <SuppressedList key={`s${key}`} tabs={tabs} refreshing={refreshing} onRefresh={refresh} />
  ) : (
    <BlockedList key={`b${key}`} tabs={tabs} refreshing={refreshing} onRefresh={refresh} />
  );
}

type Props = { tabs: React.ReactElement; refreshing: boolean; onRefresh: () => void };

function SuppressedList({ tabs, refreshing, onRefresh }: Props) {
  const theme = useTheme();
  const toast = useToast();
  const page = useLivePaginated(api.suppressions.listForCurrentUser, {}, 50);
  const release = useMutation(api.suppressions.release);
  const addManual = useMutation(api.suppressions.addManual);
  const [email, setEmail] = useState('');

  const doRelease = (s: Suppression) =>
    Alert.alert('Release this address?', `Mailmark will send to ${s.email} again. Releasing an address that hard-bounced risks your sending reputation.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Release',
        style: 'destructive',
        onPress: async () => {
          try {
            await release({ email: s.email, reason: 'Released from the mobile app' });
            toast.show({ message: `${s.email} released`, icon: 'check' });
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
          }
        },
      },
    ]);

  const add = async () => {
    try {
      await addManual({ email: email.trim() });
      setEmail('');
      toast.show({ message: 'Address suppressed', icon: 'block' });
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    }
  };

  const active = page.items.filter((s) => !s.releasedAt);

  return (
    <PagedList<Suppression>
      page={page}
      items={active}
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <View style={styles.header}>
          {tabs}
          <ThemedText type="small" themeColor="textSecondary">
            Addresses here are never sent to, from any mailbox. Swipe to release one.
          </ThemedText>
          <Field value={email} onChangeText={setEmail} placeholder="Suppress an address…" autoCapitalize="none" keyboardType="email-address" onSubmitEditing={() => isValidEmail(email) && add()} />
          {isValidEmail(email) ? <Button title="Suppress address" size="sm" onPress={add} /> : null}
        </View>
      }
      empty={{ icon: 'shield', title: 'Nothing suppressed', description: 'Hard bounces and spam complaints are added here automatically.' }}
      renderItem={(s) => (
        <SwipeRow trailing={[{ label: 'Release', icon: 'check', color: theme.info, onPress: () => doRelease(s) }]}>
          <View style={{ backgroundColor: theme.background }}>
            <ListRow
              title={s.email}
              subtitle={[listDate(s.createdAt), s.bounceSubType, s.diagnosticCode].filter(Boolean).join(' · ')}
              right={<Badge label={REASON[s.reason].label} tone={REASON[s.reason].tone} />}
              onLongPress={() => doRelease(s)}
            />
          </View>
        </SwipeRow>
      )}
    />
  );
}

function BlockedList({ tabs, refreshing, onRefresh }: Props) {
  const page = useLivePaginated(api.sendGate.listBlocksForCurrentUser, {}, 50);
  return (
    <PagedList<SendBlock>
      page={page}
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <View style={styles.header}>
          {tabs}
          <ThemedText type="small" themeColor="textSecondary">
            Individual sends the eligibility check refused, and why.
          </ThemedText>
        </View>
      }
      empty={{ icon: 'check', title: 'No blocked sends', description: 'Every recent message passed the send check.' }}
      renderItem={(b) => (
        <ListRow title={b.email} subtitle={`${b.reason.replace(/_/g, ' ')}${b.detail ? ` · ${b.detail}` : ''} · ${listDate(b.blockedAt)}`} subtitleLines={3} right={<Badge label={PATH[b.path]} />} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
