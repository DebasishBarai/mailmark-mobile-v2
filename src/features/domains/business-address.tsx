import { useMutation } from 'convex/react';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import type { Id } from '@/lib/convex/types';
import { haptic } from '@/lib/haptics';

/**
 * The business mailing address shown at the bottom of every campaign and
 * follow-up email (CAN-SPAM), saved on the domain. Same as the website's
 * BusinessAddress: on the domain screen, and on the campaign review step
 * when the sending domain has none.
 */

export const ADDRESS_WHY =
  'US law (CAN-SPAM) requires a mailing address in marketing email. It appears at the bottom of every campaign and follow-up you send.';

const MAX = 300;

export function BusinessAddressForm({ domainId, saved }: { domainId: Id<'domains'>; saved?: string }) {
  const theme = useTheme();
  const toast = useToast();
  const setAddress = useMutation(api.domains.setPostalAddress);
  const [editing, setEditing] = useState(!saved);
  const [value, setValue] = useState(saved ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const clean = await setAddress({ domainId, postalAddress: value });
      setValue(clean);
      setEditing(false);
      haptic('success');
      toast.show({ message: 'Mailing address saved', icon: 'check' });
    } catch (err) {
      setError(errorMessage(err, 'The address could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (!editing && saved) {
    return (
      <View style={styles.row}>
        <ThemedText type="small" style={styles.flex}>
          {saved}
        </ThemedText>
        <Button
          title="Edit"
          variant="secondary"
          size="sm"
          onPress={() => {
            setValue(saved);
            setError(null);
            setEditing(true);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <ThemedText type="caption" themeColor="textSecondary">
        Street address or P.O. box, city, state and ZIP code
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={setValue}
        multiline
        maxLength={MAX + 50}
        placeholder="123 Main St, Springfield, IL 62701"
        placeholderTextColor={theme.textMuted}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        accessibilityLabel="Business mailing address"
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        {saved ? (
          <Button
            title="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => {
              setValue(saved);
              setError(null);
              setEditing(false);
            }}
          />
        ) : null}
        <Button title="Save address" size="sm" loading={saving} disabled={!value.trim() || saving} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
