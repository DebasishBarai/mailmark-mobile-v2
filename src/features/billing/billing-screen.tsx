import { useAction } from 'convex/react';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, Group, Icon, ListRow, LoadingState, ProgressBar, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import { WebLinks } from '@/lib/config';
import { shortDate } from '@/lib/format';
import { freeTrialLabel, manageSubscriptions, storeName } from '@/lib/purchases';

import { PLAN_DETAILS, planName } from './plans';
import { useStorePlans } from './use-store-plans';

type PaidPlan = keyof typeof PLAN_DETAILS;

export function BillingScreen() {
  const theme = useTheme();
  const toast = useToast();
  const status = useLiveQuery(api.subscriptions.currentStatus, {});
  const usage = useLiveQuery(api.quotas.getUsageAndLimits, {});
  const checkout = useAction(api.subscriptions.createCheckoutSession);
  const cancel = useAction(api.subscriptions.cancelViaDodo);
  const store = useStorePlans();
  const [busy, setBusy] = useState<string | null>(null);

  if (status.status === 'loading' || usage.status === 'loading') return <LoadingState />;
  if (status.status === 'error') return <ErrorState error={status.error} />;

  const s = status.data;
  const sub = s?.subscription;
  const live = sub && (sub.status === 'active' || sub.status === 'trialing');
  const u = usage.data;
  // In a store build, a live plan bought on the website is shown but not
  // changed here: changing it would be a purchase outside the store.
  const webBilledInStoreBuild = store.available && live && sub?.store === undefined;
  const storeBilled = live && sub?.store !== undefined;

  const choose = async (plan: PaidPlan) => {
    if (store.available) {
      try {
        const bought = await store.purchase(plan, live ? sub : null);
        if (bought) toast.show({ message: `${PLAN_DETAILS[plan].name} is active`, icon: 'check' });
      } catch (err) {
        toast.show({ message: errorMessage(err, 'The purchase did not complete.'), tone: 'error' });
      }
      return;
    }
    setBusy(plan);
    try {
      const { url } = await checkout({ plan });
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      toast.show({ message: errorMessage(err, 'Could not open checkout.'), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const confirmCancel = () =>
    Alert.alert(
      'Cancel your subscription?',
      `Your plan stays active until ${sub?.currentPeriodEnd ? shortDate(sub.currentPeriodEnd) : 'the end of the billing period'}, then the account moves to the free limits.`,
      [
        { text: 'Keep plan', style: 'cancel' },
        {
          text: 'Cancel subscription',
          style: 'destructive',
          onPress: async () => {
            setBusy('cancel');
            try {
              await cancel({});
              toast.show({ message: 'Subscription will end at the close of this period', icon: 'check' });
            } catch (err) {
              toast.show({ message: errorMessage(err), tone: 'error' });
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <Card style={styles.current}>
        <ThemedText type="label" themeColor="textSecondary">
          Current plan
        </ThemedText>
        <View style={styles.row}>
          <ThemedText type="title" style={styles.flex}>
            {planName(u?.plan)}
          </ThemedText>
          {s?.isBetaUser ? <Badge label="Beta" tone="info" /> : null}
          {s?.isAdmin ? <Badge label="Admin" tone="info" /> : null}
          {sub ? (
            <Badge
              label={sub.cancelAtPeriodEnd ? 'Ending' : sub.status === 'trialing' ? 'Trial' : sub.status === 'past_due' ? 'Payment due' : sub.status === 'canceled' ? 'Canceled' : 'Active'}
              tone={sub.status === 'past_due' || sub.cancelAtPeriodEnd ? 'warning' : sub.status === 'canceled' ? 'neutral' : 'success'}
            />
          ) : null}
        </View>
        {sub ? (
          <ThemedText type="small" themeColor="textSecondary">
            {sub.store ? `Billed through ${sub.store === 'play_store' ? 'Google Play' : 'the App Store'}` : `$${(sub.priceMonthly / 100).toFixed(0)} / month`}
            {sub.trialEndsAt && sub.status === 'trialing' ? ` · trial ends ${shortDate(sub.trialEndsAt)}` : ''}
            {sub.currentPeriodEnd ? ` · ${sub.cancelAtPeriodEnd ? 'ends' : 'renews'} ${shortDate(sub.currentPeriodEnd)}` : ''}
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {s?.isBetaUser ? 'Beta access with Starter limits.' : 'No subscription.'}
          </ThemedText>
        )}
        {sub?.status === 'past_due' ? (
          <ThemedText type="small" themeColor="warning">
            Your last payment failed. Update your payment method to keep sending.
          </ThemedText>
        ) : null}
      </Card>

      {u ? (
        <Group title="Usage this period" footer={`Period started ${u.usage.periodStartedAt}.`}>
          <Usage label="Emails sent" used={u.usage.emailsSentThisPeriod} limit={u.limits.emailsPerMonth} />
          <Usage label="Recipients" used={u.usage.recipients} limit={u.limits.recipients} />
          <Usage label="Domains" used={u.usage.domains} limit={u.limits.domains} />
          <Usage label="Mailboxes" used={u.usage.mailboxes} limit={u.limits.mailboxes} />
        </Group>
      ) : null}

      {webBilledInStoreBuild ? (
        <ThemedText type="small" themeColor="textSecondary">
          This plan is billed through your Mailmark account on the web, and it can be cancelled here.
        </ThemedText>
      ) : (
      <Group
        title={live ? 'Change plan' : 'Choose a plan'}
        footer={
          store.available
            ? `Monthly subscriptions through ${storeName}, charged to your ${storeName} account and renewed automatically each month unless cancelled at least 24 hours before the period ends. Manage or cancel them in your ${storeName} account settings.`
            : 'Checkout and plan changes are handled by Dodo Payments in your browser. Changes apply to your account as soon as payment completes.'
        }>
        {store.loadError ? <ListRow title={store.loadError} icon="warning" onPress={() => void store.reload()} /> : null}
        {(Object.keys(PLAN_DETAILS) as PaidPlan[]).map((plan) => {
          const current = live && sub?.plan === plan;
          const pkg = store.packages[plan];
          const price = store.available ? pkg?.product.priceString : `$${PLAN_DETAILS[plan].priceMonthly}`;
          const trial = store.available && !live ? freeTrialLabel(pkg) : undefined;
          const unavailable = store.available && !pkg;
          const planBusy = busy === plan || store.busy === plan;
          return (
            <ListRow
              key={plan}
              title={price ? `${PLAN_DETAILS[plan].name} · ${price}/mo` : PLAN_DETAILS[plan].name}
              subtitle={[trial, ...PLAN_DETAILS[plan].features].filter(Boolean).join(' · ')}
              icon={current ? 'checkCircle' : 'card'}
              iconColor={current ? theme.success : undefined}
              disabled={current || unavailable || busy !== null || store.busy !== null}
              right={current ? <Badge label="Current" tone="success" /> : planBusy ? <Icon name="pending" size={14} color={theme.textMuted} /> : undefined}
              onPress={current ? undefined : () => choose(plan)}
            />
          );
        })}
      </Group>
      )}

      {store.available ? (
        <Group footer={storeBilled ? undefined : `Bought a plan in ${storeName} before? Restore it here.`}>
          {storeBilled ? (
            <ListRow title="Manage subscription" icon="external" onPress={() => void manageSubscriptions()} />
          ) : null}
          <ListRow
            title="Restore purchases"
            icon="refresh"
            disabled={store.busy !== null}
            right={store.busy === 'restore' ? <Icon name="pending" size={14} color={theme.textMuted} /> : undefined}
            onPress={() =>
              store
                .restorePurchases()
                .then(() => toast.show({ message: 'Purchases restored', icon: 'check' }))
                .catch((err) => toast.show({ message: errorMessage(err, 'Could not restore purchases.'), tone: 'error' }))
            }
          />
          <ListRow title="Terms of Use" icon="docs" onPress={() => WebBrowser.openBrowserAsync(WebLinks.terms)} />
          <ListRow title="Privacy Policy" icon="docs" onPress={() => WebBrowser.openBrowserAsync(WebLinks.privacy)} />
        </Group>
      ) : null}

      {live && sub?.dodoSubscriptionId && !sub.store && !sub.cancelAtPeriodEnd ? (
        <Button title="Cancel subscription" variant="danger" loading={busy === 'cancel'} onPress={confirmCancel} />
      ) : null}
    </Screen>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const theme = useTheme();
  const ratio = limit ? used / limit : 0;
  return (
    <View style={styles.usage}>
      <View style={styles.row}>
        <ThemedText type="body" style={styles.flex}>
          {label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {used.toLocaleString()} / {limit === null ? '∞' : limit.toLocaleString()}
        </ThemedText>
      </View>
      {limit !== null ? <ProgressBar value={ratio} color={ratio > 0.9 ? theme.danger : ratio > 0.75 ? theme.warning : theme.accent} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  usage: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
});
