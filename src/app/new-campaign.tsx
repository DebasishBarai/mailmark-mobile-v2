import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, Icon, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

const MERGE_TAGS = ['{{first_name}}', '{{company}}', '{{product}}', '{{plan}}'];

export default function NewCampaignScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { mailboxes, createCampaign } = useWorkspace();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [mailboxId, setMailboxId] = useState(mailboxes[0]?.id ?? '');
  const [recipients, setRecipients] = useState('');

  const recipientCount = recipients
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean).length;

  const canCreate = name.trim().length > 0 && subject.trim().length > 0 && recipientCount > 0;

  const create = () => {
    if (!canCreate) return;
    const id = createCampaign({
      name: name.trim(),
      subject: subject.trim(),
      mailboxId,
      recipients: recipientCount,
    });
    router.replace(`/campaigns/${id}`);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <Screen>
        <View style={styles.header}>
          <ThemedText type="heading">New campaign</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => router.back()}>
            <Icon name="close" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.form}>
          <Field label="Campaign name" value={name} onChangeText={setName} placeholder="v2.0 is live" />
          <Field
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="v2.0 is live — here is what changed"
            hint="Merge tags work here too."
          />

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Send from
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {mailboxes.map((mailbox) => {
                const selected = mailbox.id === mailboxId;
                return (
                  <Pressable
                    key={mailbox.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setMailboxId(mailbox.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? theme.accent : theme.surfaceRaised,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}>
                    <ThemedText type="smallStrong" color={selected ? theme.accentText : theme.textSecondary}>
                      {mailbox.address}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Field
            label="Recipients"
            value={recipients}
            onChangeText={setRecipients}
            multiline
            autoCapitalize="none"
            placeholder={'ada@example.com\ngrace@example.com'}
            hint={`${recipientCount} ${recipientCount === 1 ? 'recipient' : 'recipients'} — one email each, no visible list.`}
          />

          <Card tone="flat" style={styles.tags}>
            <ThemedText type="label" themeColor="textSecondary">
              Merge tags
            </ThemedText>
            <View style={styles.tagRow}>
              {MERGE_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  accessibilityRole="button"
                  accessibilityLabel={`Insert ${tag}`}
                  onPress={() => setSubject((previous) => `${previous}${tag}`)}
                  style={[styles.tag, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}>
                  <ThemedText type="monoSmall" themeColor="accent">
                    {tag}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </Card>

          <Button title="Schedule campaign" icon="campaign" onPress={create} disabled={!canCreate} fullWidth />
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
  form: {
    gap: Spacing.four,
    paddingTop: Spacing.five,
  },
  field: {
    gap: Spacing.two,
  },
  chips: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tags: {
    gap: Spacing.two,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
