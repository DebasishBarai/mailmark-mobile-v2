import * as Clipboard from 'expo-clipboard';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, Field, Group, ListRow, LoadingState, Screen, Stat } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { Config } from '@/lib/config';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLivePaginated, useLiveQuery } from '@/lib/convex/hooks';
import type { Affiliate } from '@/lib/convex/types';
import { isValidEmail } from '@/lib/email/address';
import { shortDate } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function AffiliateScreen() {
  const affiliate = useLiveQuery(api.affiliates.getMyAffiliate, {});
  if (affiliate.status === 'loading') return <LoadingState />;
  if (affiliate.status === 'error') return <ErrorState error={affiliate.error} />;
  if (!affiliate.data) return <Apply />;
  if (affiliate.data.status !== 'approved') return <Pending affiliate={affiliate.data} />;
  return <Dashboard affiliate={affiliate.data} />;
}

function Apply() {
  const toast = useToast();
  const apply = useMutation(api.affiliates.apply);
  const [payoutEmail, setPayoutEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [audience, setAudience] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await apply({ payoutEmail: payoutEmail.trim(), website: website.trim() || undefined, audienceDescription: audience.trim() });
      haptic('success');
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ThemedText type="title">Earn 30% recurring</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">
        Refer customers to Mailmark and earn 30% of their subscription every month. Applications are reviewed within 48 hours.
      </ThemedText>
      <Field label="Payout email" value={payoutEmail} onChangeText={setPayoutEmail} keyboardType="email-address" autoCapitalize="none" hint="Commissions are paid via PayPal or bank transfer to this address." />
      <Field label="Website (optional)" value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" />
      <Field label="Your audience" value={audience} onChangeText={setAudience} multiline placeholder="Who will you tell about Mailmark?" />
      <Button title="Apply" size="lg" loading={busy} disabled={!isValidEmail(payoutEmail) || !audience.trim()} onPress={submit} />
    </Screen>
  );
}

function Pending({ affiliate }: { affiliate: Affiliate }) {
  return (
    <Screen>
      <Card style={styles.card}>
        <Badge label={affiliate.status === 'pending' ? 'Under review' : 'Not approved'} tone={affiliate.status === 'pending' ? 'warning' : 'danger'} />
        <ThemedText type="heading">{affiliate.status === 'pending' ? 'Application received' : 'Application declined'}</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">
          {affiliate.status === 'pending' ? "We'll email you once it has been reviewed, usually within 48 hours." : 'Contact support if you have questions about this decision.'}
        </ThemedText>
      </Card>
    </Screen>
  );
}

function Dashboard({ affiliate }: { affiliate: Affiliate }) {
  const toast = useToast();
  const referrals = useLivePaginated(api.affiliates.getMyReferralsPage, {}, 25);
  const link = `${Config.webUrl}/?ref=${affiliate.code}`;
  const owed = affiliate.totalEarnedCents - affiliate.totalPaidCents;

  return (
    <Screen>
      <Card style={styles.card}>
        <ThemedText type="label" themeColor="textSecondary">
          Your referral link
        </ThemedText>
        <ThemedText type="mono" selectable>
          {link}
        </ThemedText>
        <View style={styles.row}>
          <Button title="Share" icon="share" style={styles.flex} onPress={() => Share.share({ message: `Email for your own domains, with campaigns built in: ${link}`, url: link })} />
          <Button
            title="Copy"
            icon="copy"
            variant="secondary"
            style={styles.flex}
            onPress={async () => {
              await Clipboard.setStringAsync(link);
              toast.show({ message: 'Link copied', icon: 'copy' });
            }}
          />
        </View>
      </Card>
      <View style={styles.row}>
        <Stat label="Referrals" value={String(affiliate.totalReferrals ?? 0)} />
        <Stat label="Active" value={String(affiliate.activeReferrals ?? 0)} />
      </View>
      <View style={styles.row}>
        <Stat label="Earned" value={money(affiliate.totalEarnedCents)} tone="accent" />
        <Stat label="Paid out" value={money(affiliate.totalPaidCents)} />
        <Stat label="Owed" value={money(owed)} />
      </View>
      <Group title="Referrals">
        {referrals.items.map((r) => (
          <ListRow
            key={r._id}
            title={r.plan ? `${r.plan[0].toUpperCase()}${r.plan.slice(1)} plan` : 'Signed up'}
            subtitle={`${shortDate(r._creationTime)} · ${r.commissionCents > 0 ? `${money(r.commissionCents)}/mo` : 'no commission yet'}`}
            right={<Badge label={r.status} tone={r.status === 'active' ? 'success' : r.status === 'canceled' ? 'neutral' : 'info'} />}
          />
        ))}
      </Group>
      {referrals.canLoadMore ? <Button title="Load more" variant="ghost" onPress={referrals.loadMore} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
