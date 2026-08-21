import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Icon, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export default function AddDomainScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addDomain } = useWorkspace();

  const [product, setProduct] = useState('');
  const [domain, setDomain] = useState('');

  const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const domainValid = DOMAIN_PATTERN.test(normalized);
  const canAdd = product.trim().length > 0 && domainValid;

  const add = () => {
    if (!canAdd) return;
    const id = addDomain(product.trim(), normalized);
    router.replace(`/domains/${id}`);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <Screen>
        <View style={styles.header}>
          <ThemedText type="heading">Add a domain</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => router.back()}>
            <Icon name="close" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.blurb}>
          Bring all your products under one roof. Mailmark walks you through DNS setup step by step,
          including MX, SPF, DKIM, and DMARC.
        </ThemedText>

        <View style={styles.form}>
          <Field label="Product name" value={product} onChangeText={setProduct} placeholder="App Five" />
          <Field
            label="Domain"
            value={domain}
            onChangeText={setDomain}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="app-five.dev"
            hint={
              domain.length > 0 && !domainValid
                ? 'Enter a bare domain, like app-five.dev'
                : 'Records are generated as soon as the domain is added.'
            }
          />

          <Card tone="flat" style={styles.next}>
            <ThemedText type="label" themeColor="textSecondary">
              What happens next
            </ThemedText>
            {[
              'Four records are generated: MX, SPF, DKIM and DMARC',
              'Add them at your DNS provider — Mailmark auto-verifies',
              'A 28-day inbox warming ramp starts on the first send',
            ].map((line) => (
              <View key={line} style={styles.nextRow}>
                <Icon name="checkCircle" size={13} color={theme.success} />
                <ThemedText type="small" style={styles.nextText}>
                  {line}
                </ThemedText>
              </View>
            ))}
          </Card>

          <Button title="Add domain" icon="domain" onPress={add} disabled={!canAdd} fullWidth />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.four,
  },
  blurb: {
    paddingTop: Spacing.three,
  },
  form: {
    gap: Spacing.four,
    paddingTop: Spacing.five,
  },
  next: {
    gap: Spacing.two,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  nextText: {
    flex: 1,
  },
});
