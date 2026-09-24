import * as Clipboard from 'expo-clipboard';
import { useAction } from 'convex/react';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Group, Icon, ListRow } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import type { Id } from '@/lib/convex/types';
import { haptic } from '@/lib/haptics';

/**
 * Creating a key shows the secret exactly once. The app keeps it only in
 * this screen's memory: it is never written to storage, and leaving the
 * screen discards it, matching the website's one-time reveal.
 */
export function NewApiKeyScreen() {
  const theme = useTheme();
  const toast = useToast();
  const create = useAction(api.apiKeys.create);
  const { domains } = useWorkspace();
  const verified = (domains.data ?? []).filter((d) => d.verified);
  const [name, setName] = useState('');
  const [domainId, setDomainId] = useState<Id<'domains'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await create({ name: name.trim(), ...(domainId ? { domainId, scope: 'domain' as const } : { scope: 'org' as const }) });
      haptic('success');
      setSecret(result.key);
    } catch (err) {
      setError(errorMessage(err, 'Could not create the key.'));
    } finally {
      setBusy(false);
    }
  };

  if (secret) {
    return (
      <KeyboardAwareScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
        <Stack.Screen options={{ title: 'Your new key', headerBackVisible: false, gestureEnabled: false }} />
        <View style={styles.inner}>
          <Card style={{ backgroundColor: theme.warningSoft, borderColor: theme.warningSoft, gap: Spacing.two }}>
            <View style={styles.row}>
              <Icon name="warning" size={16} color={theme.warning} />
              <ThemedText type="bodyStrong" themeColor="warning">
                Copy this key now
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="warning">
              It will not be shown again. Store it in your password manager or your server&apos;s secret store, never in source code.
            </ThemedText>
          </Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy API key"
            onPress={async () => {
              await Clipboard.setStringAsync(secret);
              setCopied(true);
              haptic('success');
              toast.show({ message: 'API key copied', icon: 'copy' });
            }}
            style={[styles.secret, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="mono" selectable style={styles.flex}>
              {secret}
            </ThemedText>
            <Icon name={copied ? 'check' : 'copy'} size={18} color={theme.accent} />
          </Pressable>
          <Button title="Share to password manager…" variant="secondary" icon="share" onPress={() => Share.share({ message: secret })} />
          <Button title={copied ? 'Done' : "I've saved it"} fullWidth onPress={() => router.back()} />
        </View>
      </KeyboardAwareScrollView>
    );
  }

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <View style={styles.inner}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Production server" autoFocus />
        <Group title="Access" footer="A domain key can only send from and read that domain's mailboxes. Domains must be verified.">
          <ListRow title="All domains" icon="domain" showChevron={false} onPress={() => setDomainId(null)} right={domainId === null ? <Icon name="check" size={16} color={theme.accent} /> : undefined} />
          {verified.map((d) => (
            <ListRow key={d._id} title={d.domain} icon="domain" showChevron={false} onPress={() => setDomainId(d._id)} right={domainId === d._id ? <Icon name="check" size={16} color={theme.accent} /> : undefined} />
          ))}
        </Group>
        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}
        <Button title="Create key" size="lg" fullWidth loading={busy} disabled={!name.trim()} onPress={submit} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  secret: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
  },
});
