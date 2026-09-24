import { useAction } from 'convex/react';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session';
import { PLAN_DETAILS } from '@/features/billing/plans';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';

const COPY = {
  new_user: {
    title: 'Choose a plan to get started',
    body: 'Mailmark needs an active plan before you can add domains and send mail.',
  },
  trial_ended: { title: 'Your trial has ended', body: 'Pick a plan to keep using your mailboxes.' },
  subscription_ended: {
    title: 'Your subscription has ended',
    body: 'Your data is safe. Choose a plan to pick up where you left off.',
  },
} as const;

/**
 * The website's TrialGate, as a screen: when `subscriptions.currentStatus`
 * says the account needs a plan, the workspace is replaced by a plan chooser.
 * Checkout itself is the same Dodo Payments session the website opens, shown
 * in the system browser.
 */
export function UpgradeGate({ children }: { children: ReactNode }) {
  const status = useLiveQuery(api.subscriptions.currentStatus, {});
  if (status.data?.needsUpgrade) return <UpgradeScreen reason={status.data.upgradeReason} />;
  return <>{children}</>;
}

function UpgradeScreen({ reason }: { reason: keyof typeof COPY }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useSession();
  const checkout = useAction(api.subscriptions.createCheckoutSession);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (plan: 'starter' | 'pro' | 'business') => {
    setBusy(plan);
    setError(null);
    try {
      const { url } = await checkout({ plan });
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      setError(errorMessage(err, 'Could not start checkout.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.six }]}>
      <LogoMark size={44} />
      <ThemedText type="title">{COPY[reason].title}</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        {COPY[reason].body}
      </ThemedText>
      {(Object.keys(PLAN_DETAILS) as (keyof typeof PLAN_DETAILS)[]).map((plan) => (
        <Card key={plan} style={plan === 'pro' ? { borderColor: theme.accent, borderWidth: 1.5 } : undefined}>
          <View style={styles.planHeader}>
            <ThemedText type="heading">{PLAN_DETAILS[plan].name}</ThemedText>
            <ThemedText type="heading">
              ${PLAN_DETAILS[plan].priceMonthly}
              <ThemedText type="small" themeColor="textSecondary">
                {' '}
                / mo
              </ThemedText>
            </ThemedText>
          </View>
          <View style={styles.features}>
            {PLAN_DETAILS[plan].features.map((f) => (
              <View key={f} style={styles.feature}>
                <Icon name="check" size={14} color={theme.success} />
                <ThemedText type="small">{f}</ThemedText>
              </View>
            ))}
          </View>
          <Button
            title={`Choose ${PLAN_DETAILS[plan].name}`}
            variant={plan === 'pro' ? 'primary' : 'secondary'}
            loading={busy === plan}
            disabled={busy !== null && busy !== plan}
            onPress={() => choose(plan)}
          />
        </Card>
      ))}
      {error ? (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        </View>
      ) : null}
      <ThemedText type="caption" themeColor="textMuted">
        Returning from checkout updates your account automatically.
      </ThemedText>
      <Button title="Sign out" variant="ghost" icon="logout" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  features: {
    gap: Spacing.one,
    marginVertical: Spacing.three,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  error: {
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
