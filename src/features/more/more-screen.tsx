import { useUser } from '@clerk/expo';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Badge, Group, Icon, ListRow, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session';
import { planName } from '@/features/billing/plans';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { WebLinks } from '@/lib/config';
import { api } from '@/lib/convex/api';
import { useLiveQuery } from '@/lib/convex/hooks';

const TINT = {
  domain: '#3a5f8a',
  mailbox: '#ce3a1b',
  warmup: '#c2410c',
  health: '#3f6b44',
  contacts: '#6b4b8a',
  unsub: '#8a5a2b',
  block: '#7c3aed',
  dev: '#16130f',
  play: '#2b7a78',
  billing: '#3f6b44',
  bell: '#c0392b',
  lock: '#475569',
  palette: '#8a5a2b',
  user: '#3a5f8a',
  cloud: '#d97706',
  gift: '#db2777',
  help: '#0891b2',
};

export function MoreScreen() {
  const theme = useTheme();
  const { user: clerkUser } = useUser();
  const { user, signOut } = useSession();
  const { mailboxes, domains } = useWorkspace();
  const usage = useLiveQuery(api.quotas.getUsageAndLimits, {});

  const name = user?.name || clerkUser?.fullName || user?.email || 'Your account';
  const email = user?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? '';
  const pendingDomains = (domains.data ?? []).filter((d) => !d.verified).length;

  const confirmSignOut = () =>
    Alert.alert('Sign out of Mailmark?', 'Notifications for this device stop until you sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/account')}
        style={({ pressed }) => [styles.profile, { backgroundColor: pressed ? theme.backgroundSelected : theme.surfaceRaised, borderColor: theme.border }]}>
        {clerkUser?.imageUrl ? (
          <Image source={{ uri: clerkUser.imageUrl }} style={styles.photo} accessibilityIgnoresInvertColors />
        ) : (
          <Avatar name={name} size={52} />
        )}
        <View style={styles.flex}>
          <ThemedText type="subheading" numberOfLines={1}>
            {name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {email}
          </ThemedText>
          {usage.data ? <Badge label={`${planName(usage.data.plan)} plan`} tone="accent" style={styles.badge} /> : null}
        </View>
        <Icon name="chevronRight" size={14} color={theme.textMuted} />
      </Pressable>

      <Group title="Sending">
        <ListRow
          title="Domains"
          icon="domain"
          iconTint={TINT.domain}
          value={domains.data ? String(domains.data.length) : undefined}
          right={pendingDomains ? <Badge label={`${pendingDomains} pending`} tone="warning" /> : undefined}
          onPress={() => router.push('/domains')}
        />
        <ListRow title="Mailboxes" icon="at" iconTint={TINT.mailbox} value={mailboxes.data ? String(mailboxes.data.length) : undefined} onPress={() => router.push('/mailboxes')} />
        <ListRow title="Warmup" icon="flame" iconTint={TINT.warmup} onPress={() => router.push('/warmup')} />
        <ListRow title="Deliverability" icon="heart" iconTint={TINT.health} onPress={() => router.push('/deliverability')} />
      </Group>

      <Group title="Audience">
        <ListRow title="Contacts" icon="team" iconTint={TINT.contacts} onPress={() => router.push('/contacts')} />
        <ListRow title="Unsubscribes" icon="unsubscribe" iconTint={TINT.unsub} onPress={() => router.push('/unsubscribes')} />
        <ListRow title="Suppressions & blocks" icon="block" iconTint={TINT.block} onPress={() => router.push('/suppressions')} />
      </Group>

      <Group title="Developer">
        <ListRow title="API keys & docs" icon="code" iconTint={TINT.dev} onPress={() => router.push('/developer')} />
        <ListRow title="API playground" icon="terminal" iconTint={TINT.play} onPress={() => router.push('/api-playground')} />
      </Group>

      <Group title="Account">
        <ListRow title="Plan & billing" icon="card" iconTint={TINT.billing} onPress={() => router.push('/billing')} />
        <ListRow title="Notifications" icon="bell" iconTint={TINT.bell} onPress={() => router.push('/notifications')} />
        <ListRow title="Security" icon="lock" iconTint={TINT.lock} onPress={() => router.push('/security')} />
        <ListRow title="Appearance" icon="palette" iconTint={TINT.palette} onPress={() => router.push('/appearance')} />
        <ListRow title="AWS accounts" icon="cloud" iconTint={TINT.cloud} onPress={() => router.push('/aws-accounts')} />
        <ListRow title="Affiliate program" icon="gift" iconTint={TINT.gift} onPress={() => router.push('/affiliate')} />
      </Group>

      <Group title="Help">
        <ListRow title="Help & support" icon="help" iconTint={TINT.help} onPress={() => router.push('/support')} />
        <ListRow title="Documentation" icon="docs" iconTint={TINT.user} onPress={() => WebBrowser.openBrowserAsync(WebLinks.docs)} right={<Icon name="external" size={14} color={theme.textMuted} />} showChevron={false} />
        <ListRow title="System status" icon="analytics" iconTint={TINT.health} onPress={() => WebBrowser.openBrowserAsync(WebLinks.status)} right={<Icon name="external" size={14} color={theme.textMuted} />} showChevron={false} />
      </Group>

      <Group>
        <ListRow title="Sign out" icon="logout" destructive onPress={confirmSignOut} showChevron={false} />
      </Group>

      <ThemedText type="caption" themeColor="textMuted" style={styles.version}>
        Mailmark {Constants.expoConfig?.version ?? ''} · Privacy and terms at mailmark.dev
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
  },
  flex: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  badge: {
    marginTop: Spacing.one,
  },
  version: {
    textAlign: 'center',
  },
});
