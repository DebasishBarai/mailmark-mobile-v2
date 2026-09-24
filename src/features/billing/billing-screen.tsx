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
import { shortDate } from '@/lib/format';

import { PLAN_DETAILS, planName } from './plans';

type PaidPlan = keyof typeof PLAN_DETAILS;

export function BillingScreen() {
  const theme = useTheme();
  const toast = useToast();
  const status = useLiveQuery(api.subscriptions.currentStatus, {});
  const usage = useLiveQuery(api.quotas.getUsageAndLimits, {});
  const checkout = useAction(api.subscriptions.createCheckoutSession);
  const cancel = useAction(api.subscriptions.cancelViaDodo);
  const [busy, setBusy] = useState<string | null>(null);

  if (status.status === 'loading' || usage.status === 'loading') return <LoadingState />;
  if (status.status === 'error') return <ErrorState error={status.error} />;

  const s = status.data;
  const sub = s?.subscription;
  const live = sub && (sub.status === 'active' || sub.status === 'trialing');
  const u = usage.data;

  const choose = async (plan: PaidPlan) => {
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
            ${(sub.priceMonthly / 100).toFixed(0)} / month
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

      <Group title={live ? 'Change plan' : 'Choose a plan'} footer="Checkout and plan changes are handled by Dodo Payments in your browser. Changes apply to your account as soon as payment completes.">
        {(Object.keys(PLAN_DETAILS) as PaidPlan[]).map((plan) => {
          const current = live && sub?.plan === plan;
          return (
            <ListRow
              key={plan}
              title={`${PLAN_DETAILS[plan].name} · $${PLAN_DETAILS[plan].priceMonthly}/mo`}
              subtitle={PLAN_DETAILS[plan].features.join(' · ')}
              icon={current ? 'checkCircle' : 'card'}
              iconColor={current ? theme.success : undefined}
              disabled={current || busy !== null}
              right={current ? <Badge label="Current" tone="success" /> : busy === plan ? <Icon name="pending" size={14} color={theme.textMuted} /> : undefined}
              onPress={current ? undefined : () => choose(plan)}
            />
          );
        })}
      </Group>

      {live && sub?.dodoSubscriptionId && !sub.cancelAtPeriodEnd ? (
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
