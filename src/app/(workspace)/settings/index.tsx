import { Stack, useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Avatar, Badge, Card, Divider, ListRow, ProgressBar, Screen } from '@/components/ui';
import { DOCS_URL, PLANS, SITE_URL } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import { formatLimit, formatNumber } from '@/lib/format';
import { useColorSchemeName } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

export default function SettingsScreen() {
  const router = useRouter();
  const scheme = useColorSchemeName();
  const { account, domains, mailboxes, signOut } = useWorkspace();

  const plan = PLANS.find((item) => item.id === account.planId) ?? PLANS[0];
  const usage = account.sendsThisMonth / plan.monthlySends;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Settings' }} />

      <Card style={styles.account}>
        <View style={styles.accountRow}>
          <Avatar name={account.name} size={48} />
          <View style={styles.accountText}>
            <ThemedText type="subheading">{account.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {account.email}
            </ThemedText>
          </View>
          <Badge label={plan.name} tone="accent" />
        </View>
      </Card>

      <Card style={styles.usage}>
        <View style={styles.usageHeader}>
          <ThemedText type="smallStrong">This month’s sends</ThemedText>
          <ThemedText type="mono">
            {formatNumber(account.sendsThisMonth)} / {formatNumber(plan.monthlySends)}
          </ThemedText>
        </View>
        <ProgressBar value={usage} />
        <View style={styles.usageMeta}>
          <ThemedText type="caption" themeColor="textMuted">
            {domains.length} of {formatLimit(plan.domains)} domains
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {plan.mailboxes === 'unlimited'
              ? `${mailboxes.length} mailboxes, unlimited`
              : `${mailboxes.length} of ${plan.mailboxes} mailboxes`}
          </ThemedText>
        </View>
      </Card>

      <Section title="Workspace">
        <ListRow
          title="Appearance"
          subtitle={scheme === 'dark' ? 'Enterprise Dark — following system' : 'Clean White — following system'}
          icon="palette"
          onPress={() => router.push('/settings/appearance')}
        />
        <Divider />
        <ListRow
          title="Mailboxes"
          subtitle={`${mailboxes.length} across ${domains.length} products`}
          icon="inbox"
          onPress={() => router.push('/domains')}
        />
        <Divider />
        <ListRow
          title="Team"
          subtitle="Invite a cofounder or contractor, assign mailboxes per product"
          icon="team"
          onPress={() => openBrowserAsync(`${SITE_URL}/settings/team`)}
        />
      </Section>

      <Section title="Billing">
        <ListRow
          title="Plan"
          subtitle={`${plan.name} · $${plan.price} per month`}
          icon="card"
          onPress={() => openBrowserAsync(`${SITE_URL}/pricing`)}
        />
        <Divider />
        <ListRow
          title="Notifications"
          subtitle="Deliverability alerts and campaign summaries"
          icon="bell"
          onPress={() => openBrowserAsync(`${SITE_URL}/settings/notifications`)}
        />
      </Section>

      <Section title="Developer">
        <ListRow
          title="API documentation"
          subtitle="REST API and the mailmark-sdk npm package"
          icon="api"
          onPress={() => openBrowserAsync(DOCS_URL)}
        />
        <Divider />
        <ListRow
          title="DNS setup guide"
          subtitle="MX, SPF, DKIM and DMARC, step by step"
          icon="dns"
          onPress={() => openBrowserAsync(`${SITE_URL}/dns-setup-guide`)}
        />
      </Section>

      <Section title="Account">
        <ListRow title="Sign out" icon="logout" destructive onPress={signOut} showChevron={false} />
      </Section>

      <View style={styles.footer}>
        <Logo size={24} />
        <ThemedText type="caption" themeColor="textMuted">
          Mailmark for mobile · demo build with sample data
        </ThemedText>
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="label" themeColor="textSecondary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  account: {
    marginTop: Spacing.four,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  accountText: {
    flex: 1,
    gap: 1,
  },
  usage: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  section: {
    gap: Spacing.two,
    paddingTop: Spacing.five,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.one,
  },
  footer: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.seven,
  },
});
