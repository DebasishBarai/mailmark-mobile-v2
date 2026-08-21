import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { COST_MODEL, PLANS } from '@/constants/content';
import { Radius, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

const PRODUCT_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type LineItem = { label: string; value: string };

function stitchedTogether(products: number) {
  const mailboxes = products * COST_MODEL.mailboxesPerProduct;
  const hosting = mailboxes * COST_MODEL.perMailboxMonthly;
  const warmup = products * COST_MODEL.warmupPerProductMonthly;
  const monthly =
    hosting +
    COST_MODEL.sendingApiMonthly +
    COST_MODEL.campaignToolMonthly +
    warmup +
    COST_MODEL.deliverabilityMonthly;

  return {
    counts: [
      { label: 'DNS panels to configure & keep valid', value: String(products) },
      { label: 'Mailboxes to create and watch', value: String(mailboxes) },
      { label: 'Separate tools & logins', value: '5' },
      { label: 'Places a user reply can land', value: String(mailboxes) },
      { label: 'Separate bills each month', value: '5' },
    ] satisfies LineItem[],
    costs: [
      { label: 'Mailbox hosting', value: formatCurrency(hosting) },
      { label: 'Sending API', value: formatCurrency(COST_MODEL.sendingApiMonthly) },
      { label: 'Campaign tool', value: formatCurrency(COST_MODEL.campaignToolMonthly) },
      { label: 'Inbox warm-up', value: formatCurrency(warmup) },
      { label: 'Deliverability monitoring', value: formatCurrency(COST_MODEL.deliverabilityMonthly) },
    ] satisfies LineItem[],
    monthly,
  };
}

function withMailmark(products: number) {
  const mailboxes = products * COST_MODEL.mailboxesPerProduct;
  const plan = products <= 5 ? PLANS[1] : PLANS[2];

  return {
    plan,
    counts: [
      { label: 'DNS setup, guided & auto-verified', value: String(products) },
      { label: 'Mailboxes, managed in one place', value: String(mailboxes) },
      { label: 'Separate tools & logins', value: '1' },
      { label: 'Places a user reply can land', value: '1' },
      { label: 'Separate bills each month', value: '1' },
    ] satisfies LineItem[],
    costs: [
      { label: 'Mailbox hosting', value: 'Included' },
      { label: 'Sending API', value: 'Included' },
      { label: 'Campaign tool', value: 'Included' },
      { label: 'Inbox warm-up', value: 'Included' },
      { label: 'Deliverability monitoring', value: 'Included' },
    ] satisfies LineItem[],
    monthly: plan.price,
  };
}

/**
 * Section 02 of the site — "The cost isn't the subscription. It's the
 * multiplication." Tapping a product count re-runs both columns.
 */
export function CostCalculator() {
  const theme = useTheme();
  const [products, setProducts] = useState(4);

  const stitched = useMemo(() => stitchedTogether(products), [products]);
  const mailmark = useMemo(() => withMailmark(products), [products]);
  const savings = stitched.monthly - mailmark.monthly;

  return (
    <View style={styles.wrapper}>
      <ThemedText type="body" themeColor="textSecondary">
        One product’s email setup is an afternoon. The problem is that it’s an afternoon again for
        every product you ship, and then it’s yours to maintain forever.
      </ThemedText>

      <View style={styles.stepper}>
        <ThemedText type="label" themeColor="textSecondary">
          How many products do you run?
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepperRow}>
          {PRODUCT_COUNTS.map((count) => {
            const selected = count === products;
            return (
              <Pressable
                key={count}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${count} products`}
                onPress={() => setProducts(count)}
                style={[
                  styles.step,
                  {
                    backgroundColor: selected ? theme.accent : theme.surfaceRaised,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}>
                <ThemedText
                  type="smallStrong"
                  color={selected ? theme.accentText : theme.textSecondary}>
                  {count}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
        <ThemedText type="caption" themeColor="textMuted">
          {products} {products === 1 ? 'product' : 'products'} in flight ·{' '}
          {COST_MODEL.mailboxesPerProduct} mailboxes each (hello@, support@, team@)
        </ThemedText>
      </View>

      <Column
        title="Stitching it together yourself"
        counts={stitched.counts}
        costs={stitched.costs}
        total={formatCurrency(stitched.monthly)}
        totalLabel="Every month"
        tone="plain"
      />

      <Column
        title="With Mailmark"
        counts={mailmark.counts}
        costs={mailmark.costs}
        total={formatCurrency(mailmark.monthly)}
        totalLabel={mailmark.plan.name}
        tone="accent"
      />

      <Card tone="flat" style={styles.savings}>
        <ThemedText type="body">
          At{' '}
          <ThemedText type="bodyStrong" themeColor="accent">
            {products} {products === 1 ? 'product' : 'products'}
          </ThemedText>
          , that’s{' '}
          <ThemedText type="bodyStrong" themeColor="accent">
            {formatCurrency(savings)}
          </ThemedText>{' '}
          a month, or{' '}
          <ThemedText type="bodyStrong" themeColor="accent">
            {formatCurrency(savings * 12)}
          </ThemedText>{' '}
          a year, on tools you wouldn’t be paying for.
        </ThemedText>
      </Card>

      <ThemedText type="caption" themeColor="textMuted">
        {COST_MODEL.footnote}
      </ThemedText>
    </View>
  );
}

type ColumnProps = {
  title: string;
  counts: LineItem[];
  costs: LineItem[];
  total: string;
  totalLabel: string;
  tone: 'plain' | 'accent';
};

function Column({ title, counts, costs, total, totalLabel, tone }: ColumnProps) {
  const theme = useTheme();
  const accent = tone === 'accent';

  return (
    <Card
      padded={false}
      style={[styles.column, accent && { borderColor: theme.accent, borderWidth: 1 }]}>
      <View
        style={[
          styles.columnHeader,
          { backgroundColor: accent ? theme.accentSoft : theme.surface, borderBottomColor: theme.border },
        ]}>
        <ThemedText type="subheading" themeColor={accent ? 'accent' : 'text'}>
          {title}
        </ThemedText>
      </View>

      <View style={styles.columnBody}>
        {counts.map((item) => (
          <View key={item.label} style={styles.line}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.lineLabel}>
              {item.label}
            </ThemedText>
            <ThemedText type="mono">{item.value}</ThemedText>
          </View>
        ))}
      </View>

      <View style={[styles.columnBody, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
        <ThemedText type="label" themeColor="textMuted">
          Monthly cost
        </ThemedText>
        {costs.map((item) => (
          <View key={item.label} style={styles.line}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.lineLabel}>
              {item.label}
            </ThemedText>
            <ThemedText type="mono" themeColor={item.value === 'Included' ? 'success' : 'text'}>
              {item.value}
            </ThemedText>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.totalRow,
          { backgroundColor: accent ? theme.accentSoft : theme.surface, borderTopColor: theme.border },
        ]}>
        <ThemedText type="bodyStrong" themeColor={accent ? 'accent' : 'textSecondary'}>
          {totalLabel}
        </ThemedText>
        <ThemedText type="title" themeColor={accent ? 'accent' : 'text'}>
          {total}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.four,
  },
  stepper: {
    gap: Spacing.two,
  },
  stepperRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  step: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  column: {
    overflow: 'hidden',
  },
  columnHeader: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  columnBody: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  lineLabel: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  savings: {
    marginTop: Spacing.one,
  },
});
