import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BarDatum = { key: string; label: string; value: number };

type Props = {
  data: BarDatum[];
  color: string;
  /** Unit for the readout, e.g. "sent". */
  unit: string;
  height?: number;
};

/** Top-rounded bar anchored to the baseline (4px data-end radius). */
function barPath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  if (h <= 0) return '';
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

/**
 * A single-series daily bar chart. Tap (or focus) a bar to read its value in
 * the readout above the plot; with nothing selected the readout shows the
 * period total. One series per chart: two measures are drawn as two charts.
 */
export function BarChart({ data, color, unit, height = 120 }: Props) {
  const theme = useTheme();
  const [w, setW] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  const slot = w / Math.max(1, data.length);
  const gap = 2;
  const barW = Math.max(2, slot - gap);
  const plotH = height;

  const current = selected !== null ? data[selected] : null;

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`${unit} per day, last ${data.length} days: ${total.toLocaleString()} in total, peak ${max.toLocaleString()}.`}>
      <View style={styles.readout}>
        <ThemedText type="heading">{(current ? current.value : total).toLocaleString()}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {current ? `${unit} · ${current.label}` : `${unit} · last ${data.length} days`}
        </ThemedText>
      </View>
      {w > 0 ? (
      <View style={{ width: w, height: plotH }}>
        <Svg width={w} height={plotH}>
          <Line x1={0} x2={w} y1={0.5} y2={0.5} stroke={theme.border} strokeWidth={1} strokeDasharray="2 4" />
          <Line x1={0} x2={w} y1={plotH - 0.5} y2={plotH - 0.5} stroke={theme.borderStrong} strokeWidth={1} />
          {data.map((d, i) => {
            const h = (d.value / max) * (plotH - 4);
            return (
              <Path
                key={d.key}
                d={barPath(i * slot + gap / 2, plotH - h, barW, h, 4)}
                fill={color}
                opacity={selected === null || selected === i ? 1 : 0.35}
              />
            );
          })}
        </Svg>
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.hitRow}>
            {data.map((d, i) => (
              <Pressable
                key={d.key}
                accessibilityRole="button"
                accessibilityLabel={`${d.label}: ${d.value} ${unit}`}
                onPress={() => setSelected(selected === i ? null : i)}
                style={{ width: slot, height: plotH }}
              />
            ))}
          </View>
        </View>
      </View>
      ) : (
        <View style={{ height: plotH }} />
      )}
      <View style={styles.axis}>
        <ThemedText type="caption" themeColor="textMuted">
          {data[0]?.label}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          peak {max.toLocaleString()}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {data[data.length - 1]?.label}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    marginBottom: Spacing.two,
  },
  hitRow: {
    flexDirection: 'row',
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
});
