import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Line, Polyline, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LogoMarkProps = {
  size?: number;
  /** Defaults to the theme accent (Mailmark's brand red). Pass a colour to tint the mark instead. */
  color?: string;
};

export function LogoMark({ size = 32, color }: LogoMarkProps) {
  const theme = useTheme();
  const stroke = color ?? theme.accent;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Mailmark logo">
      <Defs>
        <ClipPath id="mailmarkLogoClip">
          <Rect x="4" y="16" width="66" height="50" rx="8" />
        </ClipPath>
      </Defs>
      <Rect x="4" y="16" width="66" height="50" rx="8" fill={theme.background} />
      <Rect
        x="4"
        y="16"
        width="66"
        height="50"
        rx="8"
        fill="none"
        stroke={stroke}
        strokeWidth={7}
        strokeLinejoin="round"
      />
      <Line
        x1="4"
        y1="16"
        x2="37"
        y2="44"
        stroke={stroke}
        strokeWidth={7}
        strokeLinecap="round"
        clipPath="url(#mailmarkLogoClip)"
      />
      <Line
        x1="70"
        y1="16"
        x2="37"
        y2="44"
        stroke={stroke}
        strokeWidth={7}
        strokeLinecap="round"
        clipPath="url(#mailmarkLogoClip)"
      />
      <Circle cx="67" cy="62" r="20" fill={theme.background} />
      <Circle cx="67" cy="62" r="18" fill={stroke} />
      <Polyline
        points="58,62 65,69 77,53"
        fill="none"
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <ThemedText
      themeColor="text"
      style={[styles.wordmark, { fontSize: size, lineHeight: size * 1.2 }]}>
      Mailmark
    </ThemedText>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      <Wordmark size={size * 0.72} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  wordmark: {
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.6,
  },
});
