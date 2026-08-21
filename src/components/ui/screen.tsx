import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ScreenProps = {
  children: ReactNode;
  /** Adds the bottom safe-area inset plus room for the tab bar. */
  scroll?: boolean;
  padded?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  ref?: Ref<ScrollView>;
} & Omit<ScrollViewProps, 'children' | 'contentContainerStyle' | 'ref'>;

export function Screen({
  children,
  scroll = true,
  padded = true,
  contentContainerStyle,
  ref,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.inner, padded && styles.padded]}>{children}</View>
  );

  if (!scroll) {
    return <View style={[styles.root, { backgroundColor: theme.background }]}>{content}</View>;
  }

  return (
    <ScrollView
      ref={ref}
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + Spacing.eight + Spacing.five },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
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
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing.four,
  },
});
