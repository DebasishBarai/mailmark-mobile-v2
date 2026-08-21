import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark, Wordmark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button, Divider, Field, Icon, Screen } from '@/components/ui';
import { ACCOUNT } from '@/data/mock';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useWorkspace();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState(ACCOUNT.email);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6;

  const submit = () => {
    if (!canSubmit) return;
    setBusy(true);
    signIn(email.trim());
    router.replace('/mail');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}>
      <Screen contentContainerStyle={{ paddingTop: insets.top + Spacing.four }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.back}>
          <Icon name="back" size={18} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.brand}>
          <LogoMark size={44} />
          <Wordmark size={28} />
        </View>

        <ThemedText type="displaySmall" style={styles.title}>
          {mode === 'sign-in' ? 'Welcome back' : 'Create your workspace'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {mode === 'sign-in'
            ? 'One login for every product. No more tool sprawl.'
            : 'Try Starter or Pro free for 7 days with full access. Cancel anytime during the trial, no charge.'}
        </ThemedText>

        <View style={styles.form}>
          <Field
            label="Work email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@yourcompany.com"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            placeholder="At least 6 characters"
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />

          <Button
            title={mode === 'sign-in' ? 'Sign in' : 'Start 7-day free trial'}
            onPress={submit}
            disabled={!canSubmit}
            loading={busy}
            fullWidth
          />

          <ThemedText type="caption" themeColor="textMuted" style={styles.demoNote}>
            Demo build — any valid email and a 6-character password opens the workspace with sample
            data.
          </ThemedText>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.switchRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {mode === 'sign-in' ? 'New to Mailmark?' : 'Already have a workspace?'}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
            <ThemedText type="smallStrong" themeColor="accent">
              {mode === 'sign-in' ? 'Start a free trial' : 'Sign in'}
            </ThemedText>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
    paddingRight: Spacing.three,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
  },
  title: {
    paddingTop: Spacing.five,
  },
  form: {
    gap: Spacing.four,
    paddingTop: Spacing.five,
  },
  demoNote: {
    textAlign: 'center',
  },
  divider: {
    marginVertical: Spacing.five,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
