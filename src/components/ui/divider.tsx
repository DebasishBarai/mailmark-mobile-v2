import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Divider({ style }: { style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
