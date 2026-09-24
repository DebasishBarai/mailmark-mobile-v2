import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isValidEmail, splitAddresses } from '@/lib/email/address';
import { haptic } from '@/lib/haptics';

export type Verification = { isValid: boolean; result?: string; reason?: string };

export type RecipientFieldProps = {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  /** Named groups added to this field (To only). */
  groups?: { id: string; name: string; count: number }[];
  onRemoveGroup?: (id: string) => void;
  suggestions?: { email: string; name: string }[];
  verification?: Record<string, Verification>;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
  onFocus?: () => void;
};

/**
 * An address field that turns typed addresses into tokens on space, comma or
 * return, shows each token's verification verdict (MillionVerifier through
 * verification.verifyForCurrentUser, as the website's compose does), and
 * suggests people from the address book while typing.
 */
export function RecipientField({
  label,
  value,
  onChange,
  groups = [],
  onRemoveGroup,
  suggestions = [],
  verification = {},
  autoFocus,
  trailing,
  onFocus,
}: RecipientFieldProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);

  const commit = (raw: string) => {
    const parts = splitAddresses(raw);
    const valid = parts.filter(isValidEmail);
    const invalid = parts.filter((p) => !isValidEmail(p));
    if (valid.length > 0) {
      const lower = new Set(value.map((v) => v.toLowerCase()));
      onChange([...value, ...valid.filter((v) => !lower.has(v.toLowerCase()))]);
      haptic('selection');
    }
    setText(invalid.join(' '));
  };

  const matches = useMemo(() => {
    const term = text.trim().toLowerCase();
    if (term.length < 1) return [];
    const taken = new Set(value.map((v) => v.toLowerCase()));
    return suggestions
      .filter((s) => !taken.has(s.email.toLowerCase()))
      .filter((s) => s.email.toLowerCase().includes(term) || s.name.toLowerCase().includes(term))
      .slice(0, 5);
  }, [text, suggestions, value]);

  const toneFor = (email: string) => {
    const v = verification[email.toLowerCase()];
    if (!v) return 'default' as const;
    if (!v.isValid) return 'danger' as const;
    if (v.result === 'catch_all' || v.result === 'unknown') return 'warning' as const;
    return 'default' as const;
  };

  return (
    <View>
      <Pressable style={[styles.row, { borderBottomColor: theme.border }]} onPress={() => input.current?.focus()}>
        <ThemedText type="body" themeColor="textMuted" style={styles.label}>
          {label}
        </ThemedText>
        <View style={styles.tokens}>
          {groups.map((g) => (
            <Chip key={g.id} label={`${g.name} (${g.count})`} icon="team" selected onRemove={() => onRemoveGroup?.(g.id)} />
          ))}
          {value.map((email) => (
            <Chip
              key={email}
              label={email}
              tone={toneFor(email)}
              icon={toneFor(email) === 'danger' ? 'warning' : undefined}
              onRemove={() => onChange(value.filter((v) => v !== email))}
            />
          ))}
          <TextInput
            ref={input}
            value={text}
            autoFocus={autoFocus}
            onChangeText={(next) => {
              if (/[\s,;]$/.test(next)) commit(next);
              else setText(next);
            }}
            onSubmitEditing={() => commit(text)}
            onBlur={() => {
              setFocused(false);
              if (text.trim()) commit(text);
            }}
            onFocus={() => {
              setFocused(true);
              onFocus?.();
            }}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace' && !text && value.length > 0) {
                onChange(value.slice(0, -1));
              }
            }}
            placeholder={value.length === 0 && groups.length === 0 ? 'name@example.com' : ''}
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            accessibilityLabel={`${label} recipients`}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
        {trailing}
      </Pressable>
      {focused && matches.length > 0 ? (
        <View style={[styles.suggestions, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
          {matches.map((m) => (
            <Pressable
              key={m.email}
              accessibilityRole="button"
              onPress={() => {
                commit(m.email);
                setText('');
              }}
              style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallStrong" numberOfLines={1}>
                {m.name || m.email}
              </ThemedText>
              {m.name ? (
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                  {m.email}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  label: {
    width: 44,
    paddingTop: 10,
  },
  tokens: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 32,
  },
  input: {
    flexGrow: 1,
    minWidth: 120,
    fontFamily: Fonts.sans,
    fontSize: 15,
    paddingVertical: 8,
  },
  suggestions: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  suggestion: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
