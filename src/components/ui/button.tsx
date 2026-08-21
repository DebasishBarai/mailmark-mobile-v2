import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconAfter?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  disabled,
  loading,
  fullWidth,
  style,
}: ButtonProps) {
  const theme = useTheme();

  const palette = {
    primary: { bg: theme.accent, pressedBg: theme.accentPressed, fg: theme.accentText, border: 'transparent' },
    secondary: { bg: theme.surfaceRaised, pressedBg: theme.backgroundSelected, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', pressedBg: theme.backgroundElement, fg: theme.text, border: 'transparent' },
    danger: { bg: theme.dangerSoft, pressedBg: theme.danger, fg: theme.danger, border: 'transparent' },
  }[variant];

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        {
          backgroundColor: pressed ? palette.pressedBg : palette.bg,
          borderColor: palette.border,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={iconSize} color={palette.fg} /> : null}
          <ThemedText type={size === 'sm' ? 'smallStrong' : 'bodyStrong'} color={palette.fg}>
            {title}
          </ThemedText>
          {iconAfter ? <Icon name={iconAfter} size={iconSize} color={palette.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, minHeight: 34 },
  md: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, minHeight: 44 },
  lg: { paddingVertical: Spacing.four, paddingHorizontal: Spacing.five, minHeight: 52 },
});
