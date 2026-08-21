import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ProgressBarProps = {
  /** 0–1. Values outside the range are clamped. */
  value: number;
  color?: string;
  height?: number;
};

export function ProgressBar({ value, color, height = 6 }: ProgressBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected, height, borderRadius: height }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: color ?? theme.accent,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: Radius.pill,
  },
});
