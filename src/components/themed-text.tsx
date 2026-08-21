import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'display'
  | 'displaySmall'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'smallStrong'
  | 'caption'
  | 'label'
  | 'mono'
  | 'monoSmall';

export type ThemedTextProps = TextProps & {
  type?: TextVariant;
  themeColor?: ThemeColor;
  color?: string;
};

export function ThemedText({
  style,
  type = 'body',
  themeColor,
  color,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[{ color: color ?? theme[themeColor ?? 'text'] }, styles[type], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: Fonts.displayBold,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  displaySmall: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: Fonts.sansExtraBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  heading: {
    fontFamily: Fonts.sansBold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  subheading: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  bodyStrong: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 23,
  },
  small: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  smallStrong: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    lineHeight: 19,
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 15,
  },
  label: {
    fontFamily: Fonts.sansBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 20,
  },
  monoSmall: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 16,
  },
});
