import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CampaignDraftProvider, useCampaignDraft } from '@/features/campaigns/new/draft';
import { useStackOptions } from '@/hooks/use-stack-options';
import { exitModalStack } from '@/lib/navigation';

/** New campaign: a four-step flow in its own modal stack, sharing one draft. */
export default function NewCampaignLayout() {
  const options = useStackOptions();
  const { mailboxId } = useLocalSearchParams<{ mailboxId?: string }>();
  return (
    <CampaignDraftProvider mailboxId={mailboxId}>
      <Stack screenOptions={{ ...options, headerRight: () => <CancelButton /> }}>
        <Stack.Screen name="index" options={{ title: 'Audience' }} />
        <Stack.Screen name="content" options={{ title: 'Message' }} />
        <Stack.Screen name="follow-ups" options={{ title: 'Follow-ups' }} />
        <Stack.Screen name="review" options={{ title: 'Review' }} />
      </Stack>
    </CampaignDraftProvider>
  );
}

function CancelButton() {
  const { draft } = useCampaignDraft();
  const dirty = draft.recipients.length > 0 || !!draft.subject.trim() || !!draft.body.trim();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={10}
      onPress={() => {
        if (!dirty) return exitModalStack();
        Alert.alert('Discard this campaign?', 'Your recipients and message will be lost.', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => exitModalStack() },
        ]);
      }}>
      <ThemedText type="body" themeColor="accent">
        Cancel
      </ThemedText>
    </Pressable>
  );
}
