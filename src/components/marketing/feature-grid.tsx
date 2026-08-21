import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, Icon } from '@/components/ui';
import { FEATURES } from '@/constants/content';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function FeatureGrid() {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {FEATURES.map((feature) => (
        <Card key={feature.title} style={styles.card}>
          <View style={[styles.iconWell, { backgroundColor: theme.accentSoft }]}>
            <Icon name={feature.icon} size={18} color={theme.accent} />
          </View>
          <ThemedText type="subheading">{feature.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {feature.body}
          </ThemedText>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
  },
  iconWell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
});
