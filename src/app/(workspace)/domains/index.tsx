import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card, Icon, ProgressBar, Screen } from '@/components/ui';
import { PLANS } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import type { Domain } from '@/data/types';
import { formatLimit } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

function domainStatus(domain: Domain) {
  if (domain.records.some((record) => record.status === 'failed')) {
    return { label: 'Action needed', tone: 'danger' as const };
  }
  if (domain.records.some((record) => record.status === 'pending')) {
    return { label: 'Verifying', tone: 'warning' as const };
  }
  return { label: 'Verified', tone: 'success' as const };
}

export default function DomainsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { domains, mailboxes, account } = useWorkspace();

  const plan = PLANS.find((item) => item.id === account.planId) ?? PLANS[0];
  const domainLimit = plan.domains;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Domains',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add domain"
              hitSlop={10}
              onPress={() => router.push('/add-domain')}>
              <Icon name="add" size={22} color={theme.accent} />
            </Pressable>
          ),
        }}
      />

      <Card tone="flat" style={styles.quota}>
        <View style={styles.quotaHeader}>
          <ThemedText type="smallStrong">
            {domains.length} of {formatLimit(domainLimit)} domains
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {plan.name} plan
          </ThemedText>
        </View>
        {domainLimit !== 'unlimited' ? (
          <ProgressBar value={domains.length / domainLimit} />
        ) : null}
        <ThemedText type="caption" themeColor="textMuted">
          {mailboxes.length} mailboxes across every product, managed from one place.
        </ThemedText>
      </Card>

      <View style={styles.list}>
        {domains.map((domain) => {
          const status = domainStatus(domain);
          const boxes = mailboxes.filter((mailbox) => mailbox.domainId === domain.id);

          return (
            <Pressable
              key={domain.id}
              accessibilityRole="button"
              onPress={() => router.push(`/domains/${domain.id}`)}>
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitle}>
                    <ThemedText type="subheading">{domain.domain}</ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">
                      {domain.product}
                    </ThemedText>
                  </View>
                  <Badge label={status.label} tone={status.tone} />
                </View>

                <View style={styles.recordRow}>
                  {domain.records.map((record) => (
                    <View key={record.type} style={styles.record}>
                      <Icon
                        name={
                          record.status === 'verified'
                            ? 'checkCircle'
                            : record.status === 'pending'
                              ? 'pending'
                              : 'warning'
                        }
                        size={12}
                        color={
                          record.status === 'verified'
                            ? theme.success
                            : record.status === 'pending'
                              ? theme.warning
                              : theme.danger
                        }
                      />
                      <ThemedText type="caption" themeColor="textSecondary">
                        {record.type}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                {domain.warmingDay ? (
                  <View style={styles.warming}>
                    <ProgressBar value={domain.warmingDay / 28} color={theme.warning} />
                    <ThemedText type="caption" themeColor="warning">
                      Inbox warming · day {domain.warmingDay} of 28
                    </ThemedText>
                  </View>
                ) : null}

                <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
                  {boxes.length} {boxes.length === 1 ? 'mailbox' : 'mailboxes'}
                  {boxes.length ? ` · ${boxes.map((box) => box.address).join(', ')}` : ''}
                </ThemedText>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quota: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  quotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  card: {
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
    gap: 1,
  },
  recordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  warming: {
    gap: Spacing.one,
  },
});
