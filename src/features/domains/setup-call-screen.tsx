import { useUser } from '@clerk/expo';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { Button, Field } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { haptic } from '@/lib/haptics';

// Fixed, like the website's: the acknowledgement email repeats the subject
// back ("We received your message about Free setup call"), so it is never
// anything the person typed. The details travel in the message body, which
// only the support inbox sees.
const SUBJECT = 'Free setup call';

/**
 * "Request a free setup call", for owners stuck on their DNS records. Mirrors
 * the website's SetupCallRequest and goes through the same support form
 * (supportRequests.submit): the support inbox gets a notice with Reply-To set
 * to the owner, and the owner gets the usual acknowledgement.
 */
export function SetupCallScreen() {
  const theme = useTheme();
  const { user } = useUser();
  const submit = useMutation(api.support.submit);
  const { domainId, domain } = useLocalSearchParams<{ domainId?: string; domain?: string }>();

  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  // Prefilled once the account loads; an edit always wins over the prefill.
  const [nameInput, setNameInput] = useState<string | null>(null);
  const name = nameInput ?? user?.fullName ?? '';
  const [phone, setPhone] = useState('');
  const [bestTime, setBestTime] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!email && name.trim().length > 0 && !busy;

  const send = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const lines = [
      `Setup call request for ${domain ?? 'their domain'}`,
      '',
      `Name: ${name.trim()}`,
      `Account email: ${email}`,
      `Phone: ${phone.trim() || '(not given)'}`,
      `Best time: ${bestTime.trim() || '(not given)'}`,
      `Domain: ${domain ?? '(unknown)'}`,
      `Domain ID: ${domainId ?? '(unknown)'}`,
    ];
    if (note.trim()) lines.push('', 'Note:', note.trim());
    lines.push('', '--', `Sent from Mailmark ${Constants.expoConfig?.version ?? ''} on ${Platform.OS} ${Platform.Version}`);
    try {
      await submit({ name: name.trim(), email, subject: SUBJECT, message: lines.join('\n') });
      haptic('success');
      setSent(true);
    } catch (err) {
      haptic('error');
      setError(errorMessage(err, 'Something went wrong sending your request. Please email support@mailmark.dev instead.'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.done, { backgroundColor: theme.background }]}>
        <View style={styles.inner}>
          <ThemedText type="heading">Thanks! Your request is in.</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            We&apos;ll email you at {email} to set a time. Keep an eye on your inbox.
          </ThemedText>
          <Button title="Done" size="lg" fullWidth onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} style={{ backgroundColor: theme.background }}>
      <View style={styles.inner}>
        <ThemedText type="body" themeColor="textSecondary">
          Tell us how to reach you{domain ? ` about ${domain}` : ''}. We&apos;ll go through your DNS records with you, step by step.
          {email ? ` We'll reply to ${email} to set a time.` : ''}
        </ThemedText>
        <Field label="Your name" value={name} onChangeText={setNameInput} maxLength={200} autoComplete="name" textContentType="name" />
        <Field
          label="Phone number (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="If you'd rather we call you"
          keyboardType="phone-pad"
          maxLength={40}
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
        <Field label="Best time to reach you (optional)" value={bestTime} onChangeText={setBestTime} placeholder="e.g. weekdays after 5pm Eastern" maxLength={200} />
        <Field label="Anything we should know? (optional)" value={note} onChangeText={setNote} placeholder="e.g. My domain is with GoDaddy" maxLength={2000} multiline />
        {error ? (
          <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          </View>
        ) : null}
        <Button title="Request my call" size="lg" fullWidth loading={busy} disabled={!canSubmit} onPress={send} />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: 'center',
    paddingBottom: Spacing.eight,
  },
  done: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  error: {
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
