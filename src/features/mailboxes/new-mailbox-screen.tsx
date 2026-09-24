import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { Button, Field, Group, Icon, ListRow } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import type { Id } from '@/lib/convex/types';
import { haptic } from '@/lib/haptics';

const LOCAL_RE = /^[a-z0-9]([a-z0-9._+-]*[a-z0-9])?$/i;

export function NewMailboxScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ domainId?: string }>();
  const { domains, selectMailbox } = useWorkspace();
  const create = useMutation(api.mailboxes.create);
  const [domainId, setDomainId] = useState<string | undefined>(params.domainId ?? domains.data?.[0]?._id);
  const [address, setAddress] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const domain = domains.data?.find((d) => d._id === domainId);
  const local = address.trim().toLowerCase();
  const valid = !!domain && LOCAL_RE.test(local);

  const submit = async () => {
    if (!valid || !domain) return;
    setBusy(true);
    setError(null);
    try {
      const id = await create({ domainId: domain._id, address: local, displayName: displayName.trim() || undefined });
      haptic('success');
      selectMailbox(id);
      router.back();
    } catch (err) {
      haptic('error');
      setError(errorMessage(err, 'Could not create the mailbox.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <View style={styles.inner}>
        {!params.domainId && (domains.data?.length ?? 0) > 1 ? (
          <Group title="Domain">
            {domains.data!.map((d) => (
              <ListRow
                key={d._id}
                title={d.domain}
                subtitle={d.verified ? undefined : 'Not verified yet'}
                icon="domain"
                onPress={() => setDomainId(d._id as Id<'domains'>)}
                right={d._id === domainId ? <Icon name="check" size={16} color={theme.accent} /> : undefined}
                showChevron={false}
              />
            ))}
          </Group>
        ) : null}
        <Field
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="hello"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          hint={domain ? `${local || 'name'}@${domain.domain}` : undefined}
        />
        <Field label="Display name (optional)" value={displayName} onChangeText={setDisplayName} placeholder="Acme Support" returnKeyType="done" onSubmitEditing={submit} />
        {error ? (
          <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          </View>
        ) : null}
        <Button title="Create mailbox" size="lg" fullWidth loading={busy} disabled={!valid} onPress={submit} />
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
