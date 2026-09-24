import { Stack, router } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, IconButton } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { plural } from '@/lib/format';

import { useCampaignDraft, type FollowUpStep } from './draft';
import { StepFooter } from './step-footer';

/**
 * Follow-ups become a Mailmark sequence (sequenceActions
 * .createAndEnrollWithFirstSent), exactly as on the website: the first email
 * is recorded as already sent, and each follow-up waits its delay and is
 * skipped for anyone who has replied or bounced by then.
 */
export function FollowUpsScreen() {
  const theme = useTheme();
  const { draft, update } = useCampaignDraft();

  const set = (i: number, patch: Partial<FollowUpStep>) =>
    update({ followUps: draft.followUps.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  const add = () =>
    update({
      followUps: [
        ...draft.followUps,
        { delayDays: draft.followUps.length === 0 ? 3 : 4, subject: `Re: ${draft.subject}`, body: '' },
      ],
    });

  const incomplete = draft.followUps.some((f) => !f.subject.trim() || !f.body.trim());

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Follow-ups' }} />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <ThemedText type="small" themeColor="textSecondary">
            Step 3 of 4 · Optional. Follow-ups stop automatically for anyone who replies.
          </ThemedText>

          {draft.followUps.map((f, i) => (
            <Card key={i} style={styles.card}>
              <View style={styles.cardTop}>
                <ThemedText type="subheading" style={styles.flex}>
                  Follow-up {i + 1}
                </ThemedText>
                <IconButton
                  icon="trash"
                  label={`Remove follow-up ${i + 1}`}
                  color={theme.danger}
                  onPress={() => update({ followUps: draft.followUps.filter((_, j) => j !== i) })}
                />
              </View>
              <View style={styles.delay}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  Wait {plural(f.delayDays, 'day')} {i === 0 ? 'after the first email' : 'after the previous follow-up'}
                </ThemedText>
                <IconButton icon="minus" label="Fewer days" filled size={14} disabled={f.delayDays <= 1} onPress={() => set(i, { delayDays: Math.max(1, f.delayDays - 1) })} />
                <ThemedText type="bodyStrong" style={styles.days}>
                  {f.delayDays}
                </ThemedText>
                <IconButton icon="add" label="More days" filled size={14} disabled={f.delayDays >= 60} onPress={() => set(i, { delayDays: Math.min(60, f.delayDays + 1) })} />
              </View>
              <TextInput
                value={f.subject}
                onChangeText={(subject) => set(i, { subject })}
                placeholder="Subject"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
              <TextInput
                value={f.body}
                onChangeText={(body) => set(i, { body })}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                placeholder="Just bumping this to the top of your inbox…"
                placeholderTextColor={theme.textMuted}
                style={[styles.input, styles.body, { color: theme.text, borderColor: theme.border }]}
              />
              <ThemedText type="caption" themeColor="textMuted">
                Line breaks are kept. Merge fields work when the column name is one word (like {'{first_name}'}); fallbacks are not applied to follow-ups.
              </ThemedText>
            </Card>
          ))}

          <Button title={draft.followUps.length ? 'Add another follow-up' : 'Add a follow-up'} icon="add" variant="secondary" onPress={add} />
        </View>
      </KeyboardAwareScrollView>
      <StepFooter
        hint={incomplete ? 'Finish or remove each follow-up' : draft.followUps.length ? plural(draft.followUps.length, 'follow-up') : 'No follow-ups'}
        title="Review"
        disabled={incomplete}
        onPress={() => router.push('/campaign-new/review')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    gap: Spacing.three,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  delay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  days: {
    minWidth: 24,
    textAlign: 'center',
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  body: {
    minHeight: 120,
  },
});
