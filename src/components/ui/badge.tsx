import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  style?: ViewStyle;
};

export function Badge({ label, tone = 'neutral', icon, style }: BadgeProps) {
  const theme = useTheme();

  const palette: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.backgroundSelected, fg: theme.textSecondary },
    accent: { bg: theme.accentSoft, fg: theme.accent },
    success: { bg: theme.successSoft, fg: theme.success },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
    info: { bg: theme.infoSoft, fg: theme.info },
  };

  return (
    <View style={[styles.badge, { backgroundColor: palette[tone].bg }, style]}>
      {icon ? <Icon name={icon} size={11} color={palette[tone].fg} /> : null}
      <ThemedText type="caption" color={palette[tone].fg} style={styles.text}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingVertical: 3,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  text: {
    fontWeight: '600',
  },
});
