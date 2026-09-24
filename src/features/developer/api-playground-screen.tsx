import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, Chip, Field } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';
import { Config } from '@/lib/config';
import { haptic } from '@/lib/haptics';

import { CodeBlock } from './code-block';

type Endpoint = { method: 'GET' | 'POST'; path: string; label: string; query?: string; body?: (from: string) => string };

const ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '/v1/mailboxes', label: 'List mailboxes' },
  { method: 'GET', path: '/v1/emails', label: 'List emails', query: 'mailbox={mailbox}&folder=inbox&limit=10' },
  { method: 'GET', path: '/v1/sender-groups', label: 'List sender groups' },
  { method: 'GET', path: '/v1/contacts', label: 'List contacts' },
  { method: 'GET', path: '/v1/sequences', label: 'List sequences' },
  { method: 'GET', path: '/v1/campaign-stats', label: 'Campaign stats', query: 'type=all' },
  { method: 'GET', path: '/v1/domain-health', label: 'Domain health' },
  { method: 'GET', path: '/v1/warmup', label: 'Warmup status' },
  { method: 'GET', path: '/v1/bounces', label: 'Bounce stats', query: 'days=30' },
  { method: 'GET', path: '/v1/suppressions', label: 'Suppressions' },
  {
    method: 'POST',
    path: '/v1/send',
    label: 'Send an email',
    body: (from) =>
      JSON.stringify({ from, to: ['you@example.com'], subject: 'Hello from the Mailmark API', html: '<p>Sent from the API playground.</p>' }, null, 2),
  },
];

type Result = { status: number; ms: number; body: string } | { error: string };

/**
 * A small REST client for the public API, for trying requests with a real
 * key. The key lives only in this screen's memory and goes nowhere but the
 * Authorization header of requests to the Mailmark API.
 */
export function ApiPlaygroundScreen() {
  const theme = useTheme();
  const sheet = useActionSheet();
  const { mailboxes } = useWorkspace();
  const from = mailboxes.data?.[0]?.fullAddress ?? 'hello@yourdomain.com';
  const [key, setKey] = useState('');
  const [endpoint, setEndpoint] = useState(ENDPOINTS[0]);
  const [query, setQuery] = useState(ENDPOINTS[0].query ?? '');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const choose = () =>
    sheet.show({
      title: 'Endpoint',
      options: ENDPOINTS.map((e) => ({
        label: `${e.method} ${e.path} · ${e.label}`,
        icon: e.method === 'POST' ? ('send' as const) : ('code' as const),
        onPress: () => {
          setEndpoint(e);
          setQuery((e.query ?? '').replace('{mailbox}', encodeURIComponent(from)));
          setBody(e.body ? e.body(from) : '');
          setResult(null);
        },
      })),
    });

  const run = async () => {
    setBusy(true);
    setResult(null);
    const started = Date.now();
    try {
      if (endpoint.method === 'POST') JSON.parse(body);
      const url = `${Config.apiUrl}${endpoint.path}${query ? `?${query.replace('{mailbox}', encodeURIComponent(from))}` : ''}`;
      const res = await fetch(url, {
        method: endpoint.method,
        headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: endpoint.method === 'POST' ? body : undefined,
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON
      }
      haptic(res.ok ? 'success' : 'warning');
      setResult({ status: res.status, ms: Date.now() - started, body: pretty });
    } catch (err) {
      haptic('error');
      setResult({ error: err instanceof SyntaxError ? `The request body is not valid JSON: ${err.message}` : err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: theme.background }} contentContainerStyle={styles.scroll}>
      <View style={styles.inner}>
        <Field
          label="API key"
          value={key}
          onChangeText={setKey}
          placeholder="dm_live_…"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          hint="Kept in memory for this screen only. Create keys under API keys."
        />
        <View style={styles.block}>
          <ThemedText type="label" themeColor="textSecondary">
            Request
          </ThemedText>
          <Chip label={`${endpoint.method} ${endpoint.path}`} icon="code" onPress={choose} />
          <ThemedText type="caption" themeColor="textMuted">
            {endpoint.label}
          </ThemedText>
        </View>
        {endpoint.method === 'GET' ? (
          <Field label="Query string" value={query} onChangeText={setQuery} placeholder="limit=10" autoCapitalize="none" autoCorrect={false} />
        ) : (
          <View style={styles.block}>
            <ThemedText type="label" themeColor="textSecondary">
              JSON body
            </ThemedText>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              scrollEnabled={false}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.body, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
            />
            <ThemedText type="caption" themeColor="warning">
              This sends a real email and counts toward your monthly allowance.
            </ThemedText>
          </View>
        )}
        <Button title="Send request" icon="play" loading={busy} disabled={!key.trim().startsWith('dm_')} onPress={run} />

        {result ? (
          'error' in result ? (
            <Card>
              <ThemedText type="small" themeColor="danger">
                {result.error}
              </ThemedText>
            </Card>
          ) : (
            <View style={styles.block}>
              <View style={styles.row}>
                <Badge label={String(result.status)} tone={result.status < 300 ? 'success' : result.status < 500 ? 'warning' : 'danger'} />
                <ThemedText type="caption" themeColor="textMuted">
                  {result.ms} ms
                </ThemedText>
              </View>
              <CodeBlock code={result.body || '(empty response)'} maxHeight={420} />
            </View>
          )
        ) : null}
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
  block: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  body: {
    alignSelf: 'stretch',
    fontFamily: Fonts.mono,
    fontSize: 13,
    minHeight: 160,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    textAlignVertical: 'top',
  },
});
