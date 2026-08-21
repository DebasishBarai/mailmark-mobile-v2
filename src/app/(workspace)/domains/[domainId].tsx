import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Divider, EmptyState, Icon, ProgressBar, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { DnsStatus } from '@/data/types';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

const STATUS_TONE: Record<DnsStatus, 'success' | 'warning' | 'danger'> = {
  verified: 'success',
  pending: 'warning',
  failed: 'danger',
};

const STATUS_LABEL: Record<DnsStatus, string> = {
  verified: 'Verified',
  pending: 'Pending',
  failed: 'Failed',
};

export default function DomainScreen() {
  const theme = useTheme();
  const { domainId } = useLocalSearchParams<{ domainId: string }>();
  const { domains, mailboxes, verifyDomain } = useWorkspace();
  const [copied, setCopied] = useState<string | null>(null);

  const domain = domains.find((item) => item.id === domainId);
  const boxes = mailboxes.filter((mailbox) => mailbox.domainId === domainId);

  if (!domain) {
    return (
      <Screen scroll={false}>
        <Stack.Screen options={{ title: 'Domain' }} />
        <EmptyState icon="domain" title="Domain not found" />
      </Screen>
    );
  }

  const unverified = domain.records.some((record) => record.status !== 'verified');

  const copy = async (value: string, key: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(key);
    setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: domain.domain }} />

      <View style={styles.header}>
        <ThemedText type="title">{domain.domain}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {domain.product} · added {formatDateTime(domain.addedAt)}
        </ThemedText>
      </View>

      <Card style={styles.reputation}>
        <View style={styles.reputationHeader}>
          <ThemedText type="smallStrong">Sender reputation</ThemedText>
          <ThemedText type="mono" themeColor={domain.reputation >= 90 ? 'success' : 'warning'}>
            {domain.reputation}/100
          </ThemedText>
        </View>
        <ProgressBar
          value={domain.reputation / 100}
          color={domain.reputation >= 90 ? theme.success : theme.warning}
        />
        {domain.warmingDay ? (
          <View style={styles.warming}>
            <View style={styles.reputationHeader}>
              <ThemedText type="smallStrong">Inbox warming</ThemedText>
              <ThemedText type="mono" themeColor="warning">
                day {domain.warmingDay} of 28
              </ThemedText>
            </View>
            <ProgressBar value={domain.warmingDay / 28} color={theme.warning} />
            <ThemedText type="caption" themeColor="warning">
              Mailmark ramps volume over 28 days so Gmail and Outlook trust your mail from day one.
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="caption" themeColor="success">
            Warm-up complete. SPF, DKIM, DMARC and blacklist status are monitored continuously.
          </ThemedText>
        )}
      </Card>

      <Card style={styles.records}>
        <View style={styles.recordsHeader}>
          <ThemedText type="label" themeColor="textSecondary">
            DNS records
          </ThemedText>
          {unverified ? (
            <Button title="Re-check" size="sm" variant="ghost" icon="refresh" onPress={() => verifyDomain(domain.id)} />
          ) : null}
        </View>

        {domain.records.map((record, index) => (
          <View key={record.type}>
            {index > 0 ? <Divider style={styles.recordDivider} /> : null}
            <View style={styles.recordRow}>
              <View style={styles.recordHead}>
                <ThemedText type="smallStrong">{record.type}</ThemedText>
                <Badge label={STATUS_LABEL[record.status]} tone={STATUS_TONE[record.status]} />
              </View>
              <ThemedText type="caption" themeColor="textMuted">
                Host
              </ThemedText>
              <ThemedText type="monoSmall" selectable>
                {record.host}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                Value
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Copy ${record.type} value`}
                onPress={() => copy(record.value, record.type)}
                style={[styles.copyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ThemedText type="monoSmall" style={styles.copyValue}>
                  {record.value}
                </ThemedText>
                <Icon
                  name={copied === record.type ? 'check' : 'copy'}
                  size={13}
                  color={copied === record.type ? theme.success : theme.textMuted}
                />
              </Pressable>
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.apiKey}>
        <ThemedText type="label" themeColor="textSecondary">
          API key
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          One key per domain, scoped to this product. Transactional and campaign sends use the same
          endpoint.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy API key"
          onPress={() => copy(domain.apiKeyPreview, 'api')}
          style={[styles.copyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="monoSmall" style={styles.copyValue}>
            {domain.apiKeyPreview}
          </ThemedText>
          <Icon name={copied === 'api' ? 'check' : 'copy'} size={13} color={copied === 'api' ? theme.success : theme.textMuted} />
        </Pressable>
      </Card>

      <Card style={styles.mailboxes}>
        <ThemedText type="label" themeColor="textSecondary">
          Mailboxes
        </ThemedText>
        {boxes.length === 0 ? (
          <ThemedText type="small" themeColor="textMuted">
            No mailboxes yet on this domain.
          </ThemedText>
        ) : (
          boxes.map((mailbox) => (
            <View key={mailbox.id} style={styles.mailboxRow}>
              <Icon name="inbox" size={15} color={theme.textSecondary} />
              <View style={styles.mailboxText}>
                <ThemedText type="smallStrong">{mailbox.address}</ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {mailbox.displayName}
                </ThemedText>
              </View>
              {mailbox.unread > 0 ? <Badge label={`${mailbox.unread} unread`} tone="accent" /> : null}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.four,
  },
  reputation: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  reputationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warming: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  records: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordRow: {
    gap: Spacing.one,
  },
  recordHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  recordDivider: {
    marginVertical: Spacing.three,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  copyValue: {
    flex: 1,
  },
  apiKey: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  mailboxes: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  mailboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mailboxText: {
    flex: 1,
    gap: 1,
  },
});
