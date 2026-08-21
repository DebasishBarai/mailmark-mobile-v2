import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  multiline?: boolean;
};

export function Field({ label, hint, style, multiline, ...rest }: FieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
          multiline && styles.multiline,
          style,
        ]}
        {...rest}
      />
      {hint ? (
        <ThemedText type="caption" themeColor="textMuted">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
