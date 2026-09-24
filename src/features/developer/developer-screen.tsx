import { useMutation } from 'convex/react';
import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, EmptyState, Group, IconButton, ListRow, Screen, Segmented, SwipeRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { Config, WebLinks } from '@/lib/config';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { ApiKey } from '@/lib/convex/types';
import { shortDate, timeAgo } from '@/lib/format';

import { CodeBlock } from './code-block';

export function DeveloperScreen() {
  const theme = useTheme();
  const toast = useToast();
  const keys = useLiveQuery(api.apiKeys.listForCurrentUser, {});
  const revoke = useMutation(api.apiKeys.revoke);
  const { domains, mailboxes } = useWorkspace();
  const [tab, setTab] = useState<'curl' | 'sdk'>('curl');

  const from = mailboxes.data?.[0]?.fullAddress ?? 'hello@yourdomain.com';

  const confirmRevoke = (k: ApiKey) =>
    Alert.alert(`Revoke “${k.name}”?`, 'Anything using this key stops working immediately. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await revoke({ id: k._id });
            toast.show({ message: 'Key revoked', icon: 'check' });
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
          }
        },
      },
    ]);

  const curl = `curl -X POST ${Config.apiUrl}/v1/send \\
  -H "Authorization: Bearer dm_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "${from}",
    "to": ["recipient@example.com"],
    "subject": "Hello from Mailmark",
    "html": "<p>Sent with the Mailmark API.</p>"
  }'`;

  const sdk = `// bun add mailmark-sdk
import { Mailmark } from 'mailmark-sdk';

const client = new Mailmark(process.env.MAILMARK_API_KEY);

await client.send({
  from: '${from}',
  to: ['recipient@example.com'],
  subject: 'Hello from Mailmark',
  html: '<p>Sent with the Mailmark SDK.</p>',
});`;

  return (
    <Screen>
      <Stack.Screen
        options={{ headerRight: () => <IconButton icon="add" label="New API key" color={theme.accent} onPress={() => router.push('/new-api-key')} /> }}
      />
      <Group
        title="API keys"
        footer="Keys are shown once when created and stored only as a hash. Swipe a key to revoke it.">
        {(keys.data ?? []).map((k) => {
          const domain = domains.data?.find((d) => d._id === k.domainId);
          return (
            <SwipeRow key={k._id} trailing={[{ label: 'Revoke', icon: 'trash', color: theme.danger, onPress: () => confirmRevoke(k) }]}>
              <View style={{ backgroundColor: theme.surfaceRaised }}>
                <ListRow
                  title={k.name}
                  subtitle={`${k.keyPrefix}… · created ${shortDate(k.createdAt)}${k.lastUsedAt ? ` · used ${timeAgo(k.lastUsedAt)}` : ' · never used'}`}
                  monoSubtitle
                  icon="key"
                  right={<Badge label={k.scope === 'domain' || k.domainId ? domain?.domain ?? 'Domain' : 'All domains'} />}
                  onLongPress={() => confirmRevoke(k)}
                />
              </View>
            </SwipeRow>
          );
        })}
      </Group>
      {keys.data && keys.data.length === 0 ? (
        <EmptyState icon="key" title="No API keys" description="Create a key to send mail and read data from your own code." actionLabel="Create a key" onAction={() => router.push('/new-api-key')} />
      ) : null}

      <View style={styles.section}>
        <ThemedText type="label" themeColor="textSecondary">
          Send your first email
        </ThemedText>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'curl', label: 'cURL' }, { value: 'sdk', label: 'mailmark-sdk' }]} />
        <CodeBlock code={tab === 'curl' ? curl : sdk} />
      </View>

      <Group title="REST API">
        <ListRow title="Base URL" subtitle={Config.apiUrl} monoSubtitle icon="link" />
        <ListRow title="Try the API" subtitle="Run requests with a key, right here" icon="terminal" onPress={() => router.push('/api-playground')} />
        <ListRow title="API reference" icon="docs" onPress={() => WebBrowser.openBrowserAsync(WebLinks.apiDocs)} />
        <ListRow title="OpenAPI specification" icon="code" onPress={() => WebBrowser.openBrowserAsync(WebLinks.openApi)} />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
});
