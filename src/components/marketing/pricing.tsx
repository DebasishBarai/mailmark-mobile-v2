import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Icon } from '@/components/ui';
import { PLANS, PRICING_NOTE, type PlanId } from '@/constants/content';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PricingProps = {
  onChoose: (planId: PlanId) => void;
  /** Marks the plan the signed-in account is already on. */
  currentPlanId?: PlanId;
};

export function Pricing({ onChoose, currentPlanId }: PricingProps) {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      <ThemedText type="small" themeColor="textSecondary">
        {PRICING_NOTE}
      </ThemedText>

      {PLANS.map((plan) => {
        const current = plan.id === currentPlanId;
        return (
          <Card
            key={plan.id}
            style={[styles.card, plan.popular && { borderColor: theme.accent, borderWidth: 1 }]}>
            <View style={styles.header}>
              <ThemedText type="heading">{plan.name}</ThemedText>
              {plan.popular ? <Badge label="Most Popular" tone="accent" /> : null}
              {current ? <Badge label="Current plan" tone="success" icon="check" /> : null}
            </View>

            <View style={styles.priceRow}>
              <ThemedText type="display">${plan.price}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                / per month
              </ThemedText>
            </View>

            {plan.trial ? (
              <ThemedText type="caption" themeColor="accent">
                7-day free trial included
              </ThemedText>
            ) : null}

            <ThemedText type="small" themeColor="textSecondary">
              {plan.blurb}
            </ThemedText>

            <View style={styles.features}>
              {plan.features.map((feature) => (
                <View key={feature} style={styles.feature}>
                  <Icon name="check" size={13} color={theme.success} />
                  <ThemedText type="small" style={styles.featureText}>
                    {feature}
                  </ThemedText>
                </View>
              ))}
            </View>

            <Button
              title={current ? 'Your current plan' : plan.trial ? 'Start 7-day free trial' : `Choose ${plan.name}`}
              variant={plan.popular && !current ? 'primary' : 'secondary'}
              disabled={current}
              fullWidth
              onPress={() => onChoose(plan.id)}
            />
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  features: {
    gap: Spacing.two,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  featureText: {
    flex: 1,
  },
});
