import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Scrollable pill row instead of an equal-width control. */
  scrollable?: boolean;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  scrollable,
}: SegmentedProps<T>) {
  const theme = useTheme();

  const items = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [
          styles.item,
          !scrollable && styles.itemFlex,
          {
            backgroundColor: selected ? theme.surfaceRaised : 'transparent',
            borderColor: selected ? theme.border : 'transparent',
          },
          pressed && !selected && { backgroundColor: theme.backgroundSelected },
        ]}>
        <ThemedText type="smallStrong" themeColor={selected ? 'text' : 'textSecondary'}>
          {option.label}
        </ThemedText>
        {option.count !== undefined ? (
          <ThemedText type="caption" themeColor={selected ? 'accent' : 'textMuted'}>
            {option.count}
          </ThemedText>
        ) : null}
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}>
        {items}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    gap: 3,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scrollRow: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemFlex: {
    flex: 1,
  },
});
