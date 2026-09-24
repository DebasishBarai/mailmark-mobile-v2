import type { ReactNode, Ref } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Vertical gap between direct children. */
  gap?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  ref?: Ref<ScrollView>;
} & Omit<ScrollViewProps, 'children' | 'contentContainerStyle' | 'ref' | 'refreshControl'>;

/**
 * The scrolling body of a pushed screen. Content is capped to a readable
 * width on tablets, the native header handles the top inset (automatic
 * content insets), and the bottom gets room for the tab bar.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  gap = Spacing.five,
  refreshing,
  onRefresh,
  contentContainerStyle,
  ref,
  ...rest
}: ScreenProps) {
  const theme = useTheme();

  const content = <View style={[styles.inner, padded && styles.padded, { gap }]}>{children}</View>;

  if (!scroll) {
    return <View style={[styles.root, { backgroundColor: theme.background }]}>{content}</View>;
  }

  return (
    <ScrollView
      ref={ref}
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />
        ) : undefined
      }
      {...rest}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.eight + Spacing.five,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  padded: {
    paddingHorizontal: Spacing.four,
  },
});
