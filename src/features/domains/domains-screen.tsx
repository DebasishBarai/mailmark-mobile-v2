import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, EmptyState, ErrorState, Group, IconButton, ListRow, ListSkeleton, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Domain } from '@/lib/convex/types';

import { removalHint } from './removal-notice';

export function domainProgress(d: Domain) {
  const checks = [d.dkimVerified, d.mxVerified, d.spfVerified, d.dmarcVerified, d.mailFromMxVerified ?? false];
  return { done: checks.filter(Boolean).length, total: checks.length };
}

export function DomainsScreen() {
  const theme = useTheme();
  const { domains, mailboxes } = useWorkspace();
  const now = useNow();
  const usage = useLiveQuery(api.quotas.getUsageAndLimits, {});
  const limit = usage.data?.limits.domains;
  const atLimit = limit != null && (domains.data?.length ?? 0) >= limit;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton icon="add" label="Add domain" color={theme.accent} disabled={atLimit} onPress={() => router.push('/add-domain')} />
          ),
        }}
      />
      {domains.status === 'loading' ? (
        <ListSkeleton avatar={false} rows={3} />
      ) : domains.status === 'error' ? (
        <ErrorState error={domains.error} />
      ) : domains.data.length === 0 ? (
        <EmptyState
          icon="domain"
          title="Add your first domain"
          description="Mailmark sends and receives mail on domains you own. Add one, then copy a few DNS records to your registrar."
          actionLabel="Add a domain"
          onAction={() => router.push('/add-domain')}
        />
      ) : (
        <Screen>
          <Group
            title="Your domains"
            footer={
              limit != null
                ? `${domains.data.length} of ${limit} on your plan${atLimit ? '. Upgrade to add more.' : '.'}`
                : undefined
            }>
            {domains.data.map((d) => {
              const p = domainProgress(d);
              const count = (mailboxes.data ?? []).filter((m) => m.domainId === d._id).length;
              // Unverified domains are removed by the nightly cleanup after 7
              // days, so say when on a second line, and turn the badge red
              // in the last 2 days.
              const hint = d.verified ? null : removalHint(d._creationTime, now);
              return (
                <ListRow
                  key={d._id}
                  title={d.domain}
                  subtitle={`${count} mailbox${count === 1 ? '' : 'es'}${hint ? ` · ${p.done}/${p.total} DNS records found\n${hint.text}` : ''}`}
                  subtitleLines={4}
                  icon="domain"
                  right={
                    d.verified ? (
                      <Badge label="Verified" tone="success" icon="check" />
                    ) : hint?.urgent ? (
                      <Badge label="Removal soon" tone="danger" icon="warning" />
                    ) : (
                      <Badge label="Pending" tone="warning" icon="pending" />
                    )
                  }
                  onPress={() => router.push(`/domain/${d._id}`)}
                />
              );
            })}
          </Group>
          <View style={styles.note}>
            <ThemedText type="caption" themeColor="textMuted">
              DNS is checked automatically every hour. Open a domain to check now.
            </ThemedText>
          </View>
        </Screen>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    paddingHorizontal: Spacing.two,
  },
});
