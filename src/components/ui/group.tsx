import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GroupProps = {
  title?: string;
  footer?: string;
  children: ReactNode;
  /** Right-aligned control next to the title, e.g. an "Add" button. */
  accessory?: ReactNode;
};

/**
 * An inset grouped list section, the way iOS Settings and Android preference
 * screens group related rows: a small caps header, rows on a raised surface
 * with hairline separators, and an optional explanatory footer.
 */
export function Group({ title, footer, children, accessory }: GroupProps) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <View style={styles.group}>
      {title || accessory ? (
        <View style={styles.header}>
          {title ? (
            <ThemedText type="label" themeColor="textSecondary" style={styles.headerText}>
              {title}
            </ThemedText>
          ) : (
            <View />
          )}
          {accessory}
        </View>
      ) : null}
      {items.length > 0 ? (
        <View style={[styles.card, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
          {items.map((child, i) => (
            <Fragment key={i}>
              {i > 0 ? <View style={[styles.separator, { backgroundColor: theme.border }]} /> : null}
              {child}
            </Fragment>
          ))}
        </View>
      ) : null}
      {footer ? (
        <ThemedText type="caption" themeColor="textMuted" style={styles.footer}>
          {footer}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    minHeight: 20,
  },
  headerText: {
    flexShrink: 1,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.two,
  },
});
