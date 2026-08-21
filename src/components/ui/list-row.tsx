import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './icon';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
};

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  right,
  onPress,
  showChevron = !!onPress,
  destructive,
}: ListRowProps) {
  const theme = useTheme();
  const tint = destructive ? theme.danger : (iconColor ?? theme.textSecondary);

  const body = (
    <>
      {icon ? <Icon name={icon} size={18} color={tint} /> : null}
      <View style={styles.text}>
        <ThemedText type="bodyStrong" themeColor={destructive ? 'danger' : 'text'}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right}
      {showChevron ? <Icon name="chevronRight" size={14} color={theme.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
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
    borderRadius: Radius.md,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
