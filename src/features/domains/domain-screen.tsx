import * as Clipboard from 'expo-clipboard';
import { useAction, useMutation } from 'convex/react';
import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, Group, Icon, IconButton, ListRow, LoadingState, ProgressBar, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { WebLinks } from '@/lib/config';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery, useRefreshKey } from '@/lib/convex/hooks';
import type { DomainWithRegion, Id } from '@/lib/convex/types';
import { timeAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';

import { canRetryMailFrom, dnsRecords, fullHost, zoneFile, type DnsRecord } from './dns';

export function DomainScreen({ id }: { id: string }) {
  const { key, refreshing, refresh } = useRefreshKey();
  const domain = useLiveQuery(api.domains.getById, { domainId: id as Id<'domains'> });
  if (domain.status === 'loading') return <LoadingState />;
  if (domain.status === 'error') return <ErrorState error={domain.error} onRetry={refresh} />;
  if (!domain.data) return <ErrorState title="Domain not found" error={new Error('It may have been removed.')} onRetry={() => router.back()} />;
  return <DomainDetail key={key} domain={domain.data} refreshing={refreshing} onRefresh={refresh} />;
}

function DomainDetail({ domain, refreshing, onRefresh }: { domain: DomainWithRegion; refreshing: boolean; onRefresh: () => void }) {
  const theme = useTheme();
  const toast = useToast();
  const sheet = useActionSheet();
  const verify = useAction(api.domains.verifyDns);
  const retryMailFrom = useAction(api.domains.retryMailFromVerification);
  const removeDomain = useAction(api.domains.remove);
  const updateDisplayName = useMutation(api.mailboxes.updateDisplayName);
  const { mailboxes } = useWorkspace();
  const [busy, setBusy] = useState<'verify' | 'retry' | 'remove' | null>(null);

  const records = dnsRecords(domain);
  const done = records.filter((r) => r.verified).length;
  const domainMailboxes = (mailboxes.data ?? []).filter((m) => m.domainId === domain._id);

  const check = async () => {
    setBusy('verify');
    try {
      const result = await verify({ domainId: domain._id });
      haptic(result.verified ? 'success' : 'warning');
      toast.show({
        message: result.verified ? 'All records found. Your domain is verified.' : result.error ? result.error : 'Some records are still missing. DNS changes can take a while to spread.',
        tone: result.verified ? 'success' : 'default',
        icon: result.verified ? 'checkCircle' : 'pending',
      });
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const retry = async () => {
    setBusy('retry');
    try {
      await retryMailFrom({ domainId: domain._id });
      toast.show({ message: 'Asked AWS to check the MAIL FROM record again.', icon: 'refresh' });
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const remove = () =>
    Alert.alert(`Remove ${domain.domain}?`, `This deletes the domain and its ${domainMailboxes.length} mailbox(es), including their mail, and removes it from AWS SES. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove domain',
        style: 'destructive',
        onPress: async () => {
          setBusy('remove');
          try {
            await removeDomain({ domainId: domain._id });
            haptic('success');
            router.back();
          } catch (err) {
            toast.show({ message: errorMessage(err), tone: 'error' });
            setBusy(null);
          }
        },
      },
    ]);

  const copy = async (text: string, what: string) => {
    await Clipboard.setStringAsync(text);
    haptic('light');
    toast.show({ message: `${what} copied`, icon: 'copy' });
  };

  const shareZone = () =>
    sheet.show({
      title: 'DNS records',
      options: [
        { label: 'Copy as zone file', icon: 'copy', onPress: () => copy(zoneFile(domain.domain, records), 'Zone file') },
        { label: 'Share zone file', icon: 'share', onPress: () => void Share.share({ title: `${domain.domain} DNS`, message: zoneFile(domain.domain, records) }) },
        { label: 'Setup guide', icon: 'docs', onPress: () => void WebBrowser.openBrowserAsync(WebLinks.domainSetup) },
      ],
    });

  const editName = (id: Id<'mailboxes'>, current?: string) => {
    if (process.env.EXPO_OS === 'ios') {
      Alert.prompt('Display name', 'Shown to recipients in the From line.', async (value) => {
        try {
          await updateDisplayName({ mailboxId: id, displayName: value ?? '' });
        } catch (err) {
          toast.show({ message: errorMessage(err), tone: 'error' });
        }
      }, 'plain-text', current ?? '');
    } else {
      router.push(`/mailbox-settings/${id}`);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen
        options={{
          title: domain.domain,
          headerRight: () => <IconButton icon="share" label="Share DNS records" color={theme.accent} onPress={shareZone} />,
        }}
      />
      <Card style={styles.status}>
        <View style={styles.statusTop}>
          <View style={[styles.statusIcon, { backgroundColor: domain.verified ? theme.successSoft : theme.warningSoft }]}>
            <Icon name={domain.verified ? 'checkCircle' : 'pending'} size={22} color={domain.verified ? theme.success : theme.warning} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="heading">{domain.verified ? 'Verified' : 'Waiting for DNS'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {done} of {records.length} records found
              {domain.lastVerificationCheckAt ? ` · checked ${timeAgo(domain.lastVerificationCheckAt)}` : ''}
            </ThemedText>
          </View>
        </View>
        <ProgressBar value={done / records.length} color={domain.verified ? theme.success : theme.accent} />
        {domain.lastVerificationError && !domain.verified ? (
          <ThemedText type="small" themeColor="warning">
            {domain.lastVerificationError}
          </ThemedText>
        ) : null}
        {!domain.verified ? (
          <ThemedText type="small" themeColor="textSecondary">
            Add each record below at your DNS provider. Tap a value to copy it. Changes usually appear within minutes but can take up to 48 hours.
          </ThemedText>
        ) : null}
        <Button title="Check DNS now" icon="refresh" variant={domain.verified ? 'secondary' : 'primary'} loading={busy === 'verify'} disabled={busy !== null} onPress={check} />
        {canRetryMailFrom(domain) ? (
          <View style={styles.retry}>
            <ThemedText type="small" themeColor="textSecondary">
              AWS stopped checking your MAIL FROM record after an earlier failure. The record now looks right, so ask it to look again.
            </ThemedText>
            <Button title="Retry MAIL FROM verification" variant="secondary" size="sm" loading={busy === 'retry'} disabled={busy !== null} onPress={retry} />
          </View>
        ) : null}
      </Card>

      <View style={styles.records}>
        <ThemedText type="label" themeColor="textSecondary" style={styles.sectionLabel}>
          DNS records
        </ThemedText>
        {records.map((r) => (
          <RecordCard key={r.key} record={r} domain={domain.domain} onCopy={copy} />
        ))}
      </View>

      <Group
        title="Mailboxes"
        accessory={
          <Pressable onPress={() => router.push({ pathname: '/new-mailbox', params: { domainId: domain._id } })} hitSlop={8}>
            <ThemedText type="smallStrong" themeColor="accent">
              Add
            </ThemedText>
          </Pressable>
        }
        footer={domainMailboxes.length === 0 ? 'Create a mailbox such as hello@ or support@ to send and receive mail.' : undefined}>
        {domainMailboxes.map((m) => (
          <ListRow
            key={m._id}
            title={m.fullAddress}
            subtitle={m.displayName || 'No display name'}
            icon="at"
            onPress={() => router.push(`/mailbox-settings/${m._id}`)}
            onLongPress={() => editName(m._id, m.displayName)}
          />
        ))}
      </Group>

      <Group title="Danger zone">
        <ListRow title="Remove domain" icon="trash" destructive disabled={busy !== null} onPress={remove} showChevron={false} />
      </Group>
    </Screen>
  );
}

function RecordCard({ record, domain, onCopy }: { record: DnsRecord; domain: string; onCopy: (text: string, what: string) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.record, { backgroundColor: theme.surfaceRaised, borderColor: record.verified ? theme.border : theme.warningSoft }]}>
      <View style={styles.recordTop}>
        <Badge label={record.type} />
        <ThemedText type="smallStrong" style={styles.flex}>
          {record.purpose}
        </ThemedText>
        {record.verified ? <Badge label="Found" tone="success" icon="check" /> : <Badge label="Missing" tone="warning" />}
      </View>
      <ThemedText type="caption" themeColor="textMuted">
        {record.explanation}
      </ThemedText>
      <CopyField label="Host" value={record.name} hint={fullHost(record, domain)} onCopy={() => onCopy(record.name, 'Host')} />
      {record.priority ? <CopyField label="Priority" value={record.priority} onCopy={() => onCopy(record.priority!, 'Priority')} /> : null}
      <CopyField label="Value" value={record.value} onCopy={() => onCopy(record.value, 'Value')} />
      {record.current ? (
        <View style={[styles.current, { backgroundColor: theme.warningSoft }]}>
          <ThemedText type="caption" themeColor="warning">
            Currently found: {record.current}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function CopyField({ label, value, hint, onCopy }: { label: string; value: string; hint?: string; onCopy: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Double tap to copy`}
      onPress={onCopy}
      style={({ pressed }) => [styles.field, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
      <View style={styles.flex}>
        <ThemedText type="caption" themeColor="textMuted">
          {label}
          {hint && hint !== value ? ` · ${hint}` : ''}
        </ThemedText>
        <ThemedText type="mono" selectable>
          {value}
        </ThemedText>
      </View>
      <Icon name="copy" size={16} color={theme.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  status: {
    gap: Spacing.three,
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  retry: {
    gap: Spacing.two,
  },
  records: {
    gap: Spacing.three,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.two,
  },
  record: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
  },
  recordTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  current: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
  },
});
