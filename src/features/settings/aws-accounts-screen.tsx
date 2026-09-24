import { useMutation } from 'convex/react';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, EmptyState, ErrorState, Group, ListRow, LoadingState, Screen } from '@/components/ui';
import { useWorkspace } from '@/features/workspace/workspace';
import { WebLinks } from '@/lib/config';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { AwsAccount } from '@/lib/convex/types';
import { timeAgo } from '@/lib/format';

/**
 * Bring-your-own-AWS accounts. Connecting one means deploying a
 * CloudFormation stack in the AWS console, which is a desktop task, so the
 * app lists and removes accounts and hands connection off to the website.
 */
export function AwsAccountsScreen() {
  const toast = useToast();
  const accounts = useLiveQuery(api.awsAccounts.listForCurrentUser, {});
  const remove = useMutation(api.awsAccounts.remove);
  const { domains } = useWorkspace();

  if (accounts.status === 'loading') return <LoadingState />;
  if (accounts.status === 'error') return <ErrorState error={accounts.error} />;

  const confirmRemove = (a: AwsAccount) => {
    const inUse = (domains.data ?? []).filter((d) => d.awsAccountId === a._id);
    if (inUse.length) {
      Alert.alert('Account in use', `Remove ${inUse.map((d) => d.domain).join(', ')} first.`);
      return;
    }
    Alert.alert(`Disconnect ${a.alias}?`, 'Mailmark stops using this AWS account. The CloudFormation stack stays in your AWS account until you delete it there.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove({ accountId: a._id });
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ThemedText type="body" themeColor="textSecondary">
        Send and store mail in your own AWS account and pay AWS directly. Domains added on a connected account use its SES and S3.
      </ThemedText>
      {accounts.data.length === 0 ? (
        <EmptyState icon="cloud" title="No AWS accounts connected" description="Connecting runs a CloudFormation template in your AWS console. Start it from the website on a computer." />
      ) : (
        <Group title="Connected accounts">
          {accounts.data.map((a) => (
            <ListRow
              key={a._id}
              title={a.alias}
              subtitle={`${a.region} · ${a.awsAccountId ?? 'account id pending'}${a.sesSandbox ? ' · SES sandbox' : ''}${a.lastVerifiedAt ? ` · checked ${timeAgo(a.lastVerifiedAt)}` : ''}${a.lastError ? `\n${a.lastError}` : ''}`}
              subtitleLines={3}
              icon="cloud"
              right={<Badge label={a.status} tone={a.status === 'verified' ? 'success' : a.status === 'failed' ? 'danger' : 'warning'} />}
              onLongPress={() => confirmRemove(a)}
              onPress={() => confirmRemove(a)}
              showChevron={false}
            />
          ))}
        </Group>
      )}
      <Button title="Connect an account on the web" variant="secondary" icon="external" onPress={() => WebBrowser.openBrowserAsync(WebLinks.settings)} />
      <Button title="Bring your own AWS guide" variant="ghost" icon="docs" onPress={() => WebBrowser.openBrowserAsync(WebLinks.byoAws)} />
    </Screen>
  );
}
