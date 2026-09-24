import { useAction } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { Button, Field, Group, Icon, ListRow } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Id } from '@/lib/convex/types';
import { haptic } from '@/lib/haptics';

import { DOMAIN_RE } from './dns';

export function AddDomainScreen() {
  const theme = useTheme();
  const add = useAction(api.domains.add);
  const accounts = useLiveQuery(api.awsAccounts.listForCurrentUser, {});
  const usage = useLiveQuery(api.quotas.getUsageAndLimits, {});
  const [domain, setDomain] = useState('');
  const [account, setAccount] = useState<Id<'awsAccounts'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const valid = DOMAIN_RE.test(cleaned);
  const verifiedAccounts = (accounts.data ?? []).filter((a) => a.status === 'verified');
  const limit = usage.data?.limits.domains;
  const atLimit = limit != null && (usage.data?.usage.domains ?? 0) >= limit;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const result = await add({ domain: cleaned, ...(account ? { awsAccountId: account } : {}) });
      haptic('success');
      router.back();
      setTimeout(() => router.push(`/domain/${result.domainId}`), 0);
    } catch (err) {
      haptic('error');
      setError(errorMessage(err, 'Could not add that domain.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} style={{ backgroundColor: theme.background }}>
      <View style={styles.inner}>
        <ThemedText type="body" themeColor="textSecondary">
          Use a domain you own and can edit DNS for. You can use a subdomain like mail.example.com to keep your main domain&apos;s email untouched.
        </ThemedText>
        <Field
          label="Domain"
          value={domain}
          onChangeText={setDomain}
          placeholder="example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          hint={domain && !valid ? 'Enter a domain like example.com' : undefined}
        />
        {verifiedAccounts.length > 0 ? (
          <Group title="Send through" footer="Domains on your own AWS account send and store mail there.">
            <ListRow title="Mailmark (default)" icon="bolt" onPress={() => setAccount(null)} right={account === null ? <Icon name="check" size={16} color={theme.accent} /> : undefined} showChevron={false} />
            {verifiedAccounts.map((a) => (
              <ListRow
                key={a._id}
                title={a.alias}
                subtitle={`${a.region} · your AWS account`}
                icon="cloud"
                onPress={() => setAccount(a._id)}
                right={account === a._id ? <Icon name="check" size={16} color={theme.accent} /> : undefined}
                showChevron={false}
              />
            ))}
          </Group>
        ) : null}
        {error ? (
          <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          </View>
        ) : null}
        {atLimit ? (
          <ThemedText type="small" themeColor="warning">
            Your plan allows {limit} domain{limit === 1 ? '' : 's'}. Upgrade in Plan & billing to add more.
          </ThemedText>
        ) : null}
        <Button title="Add domain" size="lg" fullWidth loading={busy} disabled={!valid || atLimit} onPress={submit} />
        <ThemedText type="caption" themeColor="textMuted">
          Next you&apos;ll see the DNS records to add. Mailmark checks them automatically every hour.
        </ThemedText>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: 'center',
    paddingBottom: Spacing.eight,
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
