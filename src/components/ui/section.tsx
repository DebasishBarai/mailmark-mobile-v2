import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type SectionProps = {
  /** The two-digit rail number the website uses to index its sections. */
  index?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  gap?: number;
};

export function Section({ index, eyebrow, title, subtitle, children, gap = Spacing.four }: SectionProps) {
  return (
    <View style={[styles.section, { gap }]}>
      {index || eyebrow ? (
        <View style={styles.eyebrowRow}>
          {index ? (
            <ThemedText type="monoSmall" themeColor="accent">
              {index} /
            </ThemedText>
          ) : null}
          {eyebrow ? (
            <ThemedText type="label" themeColor="textSecondary">
              {eyebrow}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      {title ? <ThemedText type="displaySmall">{title}</ThemedText> : null}
      {subtitle ? (
        <ThemedText type="body" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: Spacing.seven,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
