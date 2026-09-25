import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Icon, type IconName } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Email } from '@/lib/convex/types';
import { fullDate } from '@/lib/format';

type Step = { icon: IconName; label: string; at?: number; detail?: string; tone: 'done' | 'pending' | 'bad' };

/**
 * What happened to a message after it left: SES delivery, the open pixel,
 * tracked clicks and replies, or the bounce/complaint/block that stopped it.
 */
export function DeliveryPanel({ email }: { email: Email }) {
  const theme = useTheme();
  const steps: Step[] = [];
  steps.push({ icon: 'send', label: 'Sent', at: email.date, tone: 'done' });

  if (email.deliveryStatus === 'blocked') {
    steps.push({
      icon: 'block',
      label: 'Not sent',
      at: email.blockedAt,
      detail: [email.blockReason, email.blockDetail].filter(Boolean).join(' · ') || undefined,
      tone: 'bad',
    });
  } else if (email.deliveryStatus === 'bounced' || email.deliveryStatus === 'failed') {
    steps.push({
      icon: 'bounce',
      label: email.deliveryStatus === 'bounced' ? 'Bounced' : 'Delivery failed',
      at: email.bouncedAt,
      detail: [email.bounceType, email.bounceSubType, email.diagnosticCode].filter(Boolean).join(' · ') || undefined,
      tone: 'bad',
    });
  } else if (email.deliveryStatus === 'complained') {
    steps.push({ icon: 'warning', label: 'Marked as spam by recipient', at: email.complainedAt, tone: 'bad' });
  } else if (email.deliveryStatus === 'delivered' || email.openedAt) {
    steps.push({ icon: 'check', label: 'Delivered', at: email.deliveredAt, tone: 'done' });
  } else {
    steps.push({ icon: 'pending', label: 'Waiting for delivery confirmation', tone: 'pending' });
  }

  if (email.openedAt) steps.push({ icon: 'doubleCheck', label: 'Opened', at: email.openedAt, tone: 'done' });
  for (const click of email.clickedLinks ?? []) {
    steps.push({ icon: 'cursor', label: 'Clicked a link', at: click.clickedAt, detail: click.url, tone: 'done' });
  }
  if (email.repliedAt) steps.push({ icon: 'reply', label: 'Replied', at: email.repliedAt, tone: 'done' });

  const color = (tone: Step['tone']) =>
    tone === 'bad' ? theme.danger : tone === 'pending' ? theme.textMuted : theme.success;

  return (
    <Card style={styles.card}>
      <ThemedText type="label" themeColor="textSecondary">
        Delivery
      </ThemedText>
      {steps.map((step, i) => (
        <View key={`${step.label}-${i}`} style={styles.step}>
          <View style={styles.rail}>
            <Icon name={step.icon} size={16} color={color(step.tone)} />
            {i < steps.length - 1 ? <View style={[styles.line, { backgroundColor: theme.border }]} /> : null}
          </View>
          <View style={styles.text}>
            <ThemedText type="smallStrong" color={step.tone === 'bad' ? theme.danger : undefined}>
              {step.label}
            </ThemedText>
            {step.at ? (
              <ThemedText type="caption" themeColor="textMuted">
                {fullDate(step.at)}
              </ThemedText>
            ) : null}
            {step.detail ? (
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={3} selectable>
                {step.detail}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rail: {
    alignItems: 'center',
    width: 18,
  },
  line: {
    width: 1,
    flex: 1,
    marginTop: 4,
    minHeight: 8,
  },
  text: {
    flex: 1,
    paddingBottom: Spacing.one,
  },
});
