import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Icon, type IconName } from './icon';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Short value shown on the right, like a settings value. */
  value?: string;
  icon?: IconName;
  /** Tile colour behind the icon; omit for a bare icon. */
  iconTint?: string;
  iconColor?: string;
  right?: ReactNode;
  left?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Renders a native switch on the right. */
  toggle?: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean };
  subtitleLines?: number;
  monoSubtitle?: boolean;
  accessibilityHint?: string;
};

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  iconTint,
  iconColor,
  right,
  left,
  onPress,
  onLongPress,
  showChevron,
  destructive,
  disabled,
  toggle,
  subtitleLines = 2,
  monoSubtitle,
  accessibilityHint,
}: ListRowProps) {
  const theme = useTheme();
  const tint = destructive ? theme.danger : (iconColor ?? (iconTint ? '#ffffff' : theme.textSecondary));

  const body = (
    <>
      {left}
      {icon ? (
        iconTint ? (
          <View style={[styles.tile, { backgroundColor: iconTint }]}>
            <Icon name={icon} size={16} color={tint} />
          </View>
        ) : (
          <Icon name={icon} size={20} color={tint} />
        )
      ) : null}
      <View style={styles.text}>
        <ThemedText type="body" themeColor={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            type={monoSubtitle ? 'monoSmall' : 'small'}
            themeColor="textSecondary"
            numberOfLines={subtitleLines}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value ? (
        <ThemedText type="body" themeColor="textSecondary" numberOfLines={1} style={styles.value}>
          {value}
        </ThemedText>
      ) : null}
      {right}
      {toggle ? (
        <Switch
          value={toggle.value}
          disabled={toggle.disabled || disabled}
          onValueChange={(next) => {
            haptic('selection');
            toggle.onChange(next);
          }}
          trackColor={{ true: theme.accent, false: theme.backgroundSelected }}
          thumbColor="#ffffff"
          accessibilityLabel={title}
        />
      ) : null}
      {(showChevron ?? !!onPress) && onPress && !toggle ? <Icon name="chevronRight" size={14} color={theme.textMuted} /> : null}
    </>
  );

  if (!onPress && !onLongPress) {
    return <View style={[styles.row, disabled && styles.disabled]}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.backgroundSelected },
        disabled && styles.disabled,
      ]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    minHeight: 50,
  },
  tile: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  value: {
    maxWidth: '45%',
  },
  disabled: {
    opacity: 0.5,
  },
});
