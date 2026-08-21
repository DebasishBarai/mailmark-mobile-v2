import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './icon';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.empty}>
      <Icon name={icon} size={28} color={theme.textMuted} />
      <ThemedText type="subheading" themeColor="textSecondary">
        {title}
      </ThemedText>
      {description ? (
        <ThemedText type="small" themeColor="textMuted" style={styles.description}>
          {description}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.eight,
    paddingHorizontal: Spacing.five,
  },
  description: {
    textAlign: 'center',
  },
});
