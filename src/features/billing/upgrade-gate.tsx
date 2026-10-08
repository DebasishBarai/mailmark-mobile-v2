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
import { useStorePlans } from '@/features/billing/use-store-plans';
import { useDeleteAccount } from '@/features/settings/use-delete-account';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import { WebLinks } from '@/lib/config';
import { freeTrialLabel, storeName } from '@/lib/purchases';

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
 * in the system browser. In a store build (RevenueCat keys set) the plans are
 * App Store / Google Play subscriptions instead, as App Review requires; the
 * gate lifts once storeSubscriptions.syncMine has written the plan.
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
  const { confirmDelete, deleting } = useDeleteAccount();
  const checkout = useAction(api.subscriptions.createCheckoutSession);
  const store = useStorePlans();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (plan: 'starter' | 'pro' | 'business') => {
    setError(null);
    if (store.available) {
      try {
        await store.purchase(plan);
      } catch (err) {
        setError(errorMessage(err, 'The purchase did not complete.'));
      }
      return;
    }
    setBusy(plan);
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
      {store.loadError ? (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger">
            {store.loadError}
          </ThemedText>
          <Button title="Try again" variant="secondary" size="sm" onPress={() => void store.reload()} />
        </View>
      ) : null}
      {(Object.keys(PLAN_DETAILS) as (keyof typeof PLAN_DETAILS)[]).map((plan) => {
        const pkg = store.packages[plan];
        // A store build shows the store's own localized price, or nothing
        // until it has loaded: never a price the store will not charge.
        const price = store.available ? pkg?.product.priceString : `$${PLAN_DETAILS[plan].priceMonthly}`;
        const trial = store.available ? freeTrialLabel(pkg) : undefined;
        const unavailable = store.available && !store.loading && !pkg;
        const planBusy = busy === plan || store.busy === plan;
        return (
        <Card key={plan} style={plan === 'pro' ? { borderColor: theme.accent, borderWidth: 1.5 } : undefined}>
          <View style={styles.planHeader}>
            <ThemedText type="heading">{PLAN_DETAILS[plan].name}</ThemedText>
            {price ? (
              <ThemedText type="heading">
                {price}
                <ThemedText type="small" themeColor="textSecondary">
                  {' '}
                  / mo
                </ThemedText>
              </ThemedText>
            ) : null}
          </View>
          {trial ? (
            <ThemedText type="small" themeColor="success">
              {trial}, then {price} / month
            </ThemedText>
          ) : null}
          <View style={styles.features}>
            {PLAN_DETAILS[plan].features.map((f) => (
              <View key={f} style={styles.feature}>
                <Icon name="check" size={14} color={theme.success} />
                <ThemedText type="small">{f}</ThemedText>
              </View>
            ))}
          </View>
          <Button
            title={unavailable ? 'Not available' : `Choose ${PLAN_DETAILS[plan].name}`}
            variant={plan === 'pro' ? 'primary' : 'secondary'}
            loading={planBusy || (store.available && store.loading)}
            disabled={unavailable || ((busy !== null || store.busy !== null) && !planBusy)}
            onPress={() => choose(plan)}
          />
        </Card>
        );
      })}
      {error ? (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        </View>
      ) : null}
      {store.available ? (
        <>
          <ThemedText type="caption" themeColor="textMuted">
            Plans are monthly subscriptions. Payment is charged to your {storeName} account when you confirm the
            purchase, and the subscription renews automatically each month unless it is cancelled at least 24 hours
            before the end of the current period. Manage or cancel it in your {storeName} account settings.
          </ThemedText>
          <View style={styles.links}>
            <Button title="Terms of Use" variant="ghost" size="sm" onPress={() => WebBrowser.openBrowserAsync(WebLinks.terms)} />
            <Button title="Privacy Policy" variant="ghost" size="sm" onPress={() => WebBrowser.openBrowserAsync(WebLinks.privacy)} />
          </View>
          <Button
            title="Restore purchases"
            variant="ghost"
            loading={store.busy === 'restore'}
            disabled={store.busy !== null && store.busy !== 'restore'}
            onPress={() =>
              store.restorePurchases().catch((err) => setError(errorMessage(err, 'Could not restore purchases.')))
            }
          />
        </>
      ) : (
        <ThemedText type="caption" themeColor="textMuted">
          Returning from checkout updates your account automatically.
        </ThemedText>
      )}
      <Button title="Sign out" variant="ghost" icon="logout" onPress={signOut} />
      <Button
        title="Delete account"
        variant="ghost"
        icon="trash"
        loading={deleting}
        onPress={confirmDelete}
      />
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
    gap: Spacing.two,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
