import { Pressable, StyleSheet } from 'react-native';

import { Icon, type IconName } from './icon';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChipProps = {
  label: string;
  icon?: IconName;
  selected?: boolean;
  tone?: 'default' | 'danger' | 'warning' | 'success';
  onPress?: () => void;
  onRemove?: () => void;
};

/** A token: a recipient in a To field, a filter, a merge field. */
export function Chip({ label, icon, selected, tone = 'default', onPress, onRemove }: ChipProps) {
  const theme = useTheme();
  const palette = {
    default: { bg: selected ? theme.accentSoft : theme.backgroundElement, fg: selected ? theme.accent : theme.text },
    danger: { bg: theme.dangerSoft, fg: theme.danger },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    success: { bg: theme.successSoft, fg: theme.success },
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={onRemove ? `${label}, remove` : label}
      onPress={onRemove ?? onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: palette.bg, borderColor: selected ? theme.accent : 'transparent' },
        pressed && styles.pressed,
      ]}>
      {icon ? <Icon name={icon} size={13} color={palette.fg} /> : null}
      <ThemedText type="smallStrong" color={palette.fg} numberOfLines={1} style={styles.label}>
        {label}
      </ThemedText>
      {onRemove ? <Icon name="close" size={11} color={palette.fg} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    maxWidth: 260,
  },
  label: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
