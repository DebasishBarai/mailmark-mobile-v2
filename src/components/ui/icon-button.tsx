import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';

import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

export type IconButtonProps = {
  icon: IconName;
  onPress?: () => void;
  onLongPress?: () => void;
  label: string;
  color?: string;
  size?: number;
  disabled?: boolean;
  filled?: boolean;
  style?: ViewStyle;
};

/** A 44pt square tap target around an icon, labelled for screen readers. */
export function IconButton({ icon, onPress, onLongPress, label, color, size = 20, disabled, filled, style }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      disabled={disabled}
      onPress={() => {
        haptic('selection');
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.button,
        filled && { backgroundColor: theme.backgroundElement },
        pressed && { backgroundColor: theme.backgroundSelected },
        disabled && styles.disabled,
        style,
      ]}>
      <Icon name={icon} size={size} color={color ?? theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
