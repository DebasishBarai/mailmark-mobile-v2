import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Icon } from '@/components/ui';
import { HOW_IT_WORKS } from '@/constants/content';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function HowItWorks() {
  const theme = useTheme();

  return (
    <View style={styles.list}>
      {HOW_IT_WORKS.map((step) => (
        <Card key={step.step} style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.number, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallStrong" color={theme.accentText}>
                {step.step}
              </ThemedText>
            </View>
            <Icon name={step.icon} size={18} color={theme.textSecondary} />
            <ThemedText type="heading" style={styles.title}>
              {step.title}
            </ThemedText>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {step.body}
          </ThemedText>

          <View style={styles.bullets}>
            {step.bullets.map((bullet) => (
              <View key={bullet} style={styles.bullet}>
                <Icon name="checkCircle" size={14} color={theme.success} />
                <ThemedText type="small" style={styles.bulletText}>
                  {bullet}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>
      ))}
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
    gap: Spacing.two,
  },
  number: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  title: {
    flex: 1,
  },
  bullets: {
    gap: Spacing.two,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bulletText: {
    flex: 1,
  },
});
