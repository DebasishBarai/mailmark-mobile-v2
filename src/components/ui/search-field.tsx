import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from './icon';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function SearchField({ value, onChangeText, placeholder = 'Search', autoFocus }: SearchFieldProps) {
  const theme = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
      <Icon name="search" size={16} color={theme.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
        style={[styles.input, { color: theme.text }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => onChangeText('')}>
          <Icon name="close" size={14} color={theme.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 15,
    paddingVertical: Spacing.two,
  },
});
