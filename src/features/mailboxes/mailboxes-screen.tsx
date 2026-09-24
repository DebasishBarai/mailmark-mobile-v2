import { router, Stack } from 'expo-router';

import { Badge, EmptyState, ErrorState, Group, IconButton, ListRow, ListSkeleton, Screen } from '@/components/ui';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { useLiveQuery } from '@/lib/convex/hooks';

export function MailboxesScreen() {
  const theme = useTheme();
  const { mailboxes, domains, unreadByMailbox } = useWorkspace();
  const usage = useLiveQuery(api.quotas.getUsageAndLimits, {});
  const verified = (domains.data ?? []).filter((d) => d.verified);
  const limit = usage.data?.limits.mailboxes;

  const add = () =>
    router.push({ pathname: '/new-mailbox', params: verified.length === 1 ? { domainId: verified[0]._id } : {} });

  if (mailboxes.status === 'loading' || domains.status === 'loading') return <ListSkeleton avatar={false} />;
  if (mailboxes.status === 'error') return <ErrorState error={mailboxes.error} />;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton icon="add" label="New mailbox" color={theme.accent} disabled={!domains.data?.length} onPress={add} />,
        }}
      />
      {mailboxes.data.length === 0 ? (
        <EmptyState
          icon="at"
          title="No mailboxes yet"
          description={domains.data?.length ? 'Create an address like hello@ or support@ on one of your domains.' : 'Add a domain first, then create mailboxes on it.'}
          actionLabel={domains.data?.length ? 'New mailbox' : 'Add a domain'}
          onAction={domains.data?.length ? add : () => router.push('/add-domain')}
        />
      ) : (
        <Screen>
          {(domains.data ?? []).map((d) => {
            const list = mailboxes.data.filter((m) => m.domainId === d._id);
            if (list.length === 0) return null;
            return (
              <Group key={d._id} title={d.domain} footer={d.verified ? undefined : 'This domain is not verified yet, so these mailboxes cannot send.'}>
                {list.map((m) => (
                  <ListRow
                    key={m._id}
                    title={m.displayName || m.address}
                    subtitle={m.fullAddress}
                    icon="at"
                    right={unreadByMailbox[m._id] ? <Badge label={`${unreadByMailbox[m._id]} unread`} tone="accent" /> : undefined}
                    onPress={() => router.push(`/mailbox-settings/${m._id}`)}
                  />
                ))}
              </Group>
            );
          })}
          {limit != null ? (
            <Group footer={`${mailboxes.data.length} of ${limit} mailboxes on your plan.`}>
              <ListRow title="Plan & billing" icon="card" onPress={() => router.push('/billing')} />
            </Group>
          ) : null}
        </Screen>
      )}
    </>
  );
}
