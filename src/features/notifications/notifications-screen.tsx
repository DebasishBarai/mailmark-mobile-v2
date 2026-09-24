import { useMutation } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Group, ListRow, LoadingState, Screen } from '@/components/ui';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { NotificationPreferences } from '@/lib/convex/types';

import { CATEGORIES, CHANNELS, getPushToken } from './push';
import { usePushRegistration, type RegisterResult } from './use-push-registration';

const PREFS: { key: keyof NotificationPreferences; title: string; subtitle: string }[] = [
  { key: 'newMail', title: 'New mail', subtitle: 'Every message that arrives in your mailboxes' },
  { key: 'replies', title: 'Replies', subtitle: 'Someone replied to mail or a campaign you sent' },
  { key: 'bounces', title: 'Bounces & delivery problems', subtitle: 'A message bounced, was marked as spam or was not sent' },
  { key: 'campaigns', title: 'Campaigns', subtitle: 'Scheduled campaigns sent, follow-ups finished' },
  { key: 'account', title: 'Account & billing', subtitle: 'Domain verified, plan limits, payment problems' },
];

const REASONS: Record<string, string> = {
  denied: 'Notifications are turned off for Mailmark. Turn them on in Settings.',
  simulator: 'Push notifications need a physical device.',
  'no-project-id': 'This build has no EAS project ID, so it cannot receive push notifications. Run `eas init` and rebuild.',
  web: 'Push notifications are available in the iOS and Android apps.',
  error: 'Could not register this device for notifications.',
};

export function NotificationsScreen() {
  const toast = useToast();
  const push = usePushRegistration();
  const prefs = useLiveQuery(api.mobile.getNotificationPreferences, push.available ? {} : 'skip');
  const setPrefs = useMutation(api.mobile.setNotificationPreferences);
  const [permission, setPermission] = useState<string | null>(null);
  const [state, setState] = useState<RegisterResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.getPermissionsAsync().then((p) => setPermission(p.status));
    getPushToken(false).then(setState).catch(() => {});
  }, []);

  if (!push.capabilitiesLoaded) return <LoadingState />;

  if (!push.available) {
    return (
      <Screen>
        <Card>
          <ThemedText type="subheading">Push notifications are not enabled on this Mailmark server</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            The backend needs the mobile extension (mobile.ts and pushNotifications.ts) to store device tokens and send notifications. Everything else in the app works without it.
          </ThemedText>
        </Card>
      </Screen>
    );
  }

  const enable = async () => {
    setBusy(true);
    try {
      const result = await push.enable(true);
      if (result) setState(result);
      const p = await Notifications.getPermissionsAsync();
      setPermission(p.status);
      if (result && !result.ok) {
        toast.show({ message: result.message ?? REASONS[result.reason], tone: 'error' });
        if (result.reason === 'denied') void Linking.openSettings();
      } else if (result?.ok) {
        toast.show({ message: 'Notifications are on', icon: 'bell' });
      }
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test notification',
        body: 'Tapping this opens Insights. This is how Mailmark notifications will look.',
        data: { url: '/insights' },
        categoryIdentifier: CATEGORIES.campaign,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: CHANNELS.account },
    });
    toast.show({ message: 'Sending a test in 2 seconds. Lock your phone to see it.', icon: 'bell' });
  };

  const current = prefs.data;
  const update = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      await setPrefs({ [key]: value });
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    }
  };

  const granted = permission === 'granted' && state?.ok !== false;

  return (
    <Screen>
      {!granted ? (
        <Card>
          <ThemedText type="subheading">Turn on notifications</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {state && !state.ok ? REASONS[state.reason] : 'Hear about replies, bounces and finished campaigns as they happen. Tapping a notification opens the message or campaign.'}
          </ThemedText>
          <Button title={permission === 'denied' ? 'Open Settings' : 'Enable notifications'} icon="bell" loading={busy} onPress={permission === 'denied' ? () => Linking.openSettings() : enable} />
        </Card>
      ) : null}

      <Group title="Notify me about" footer="These apply to every device signed in to your account.">
        {PREFS.map((p) => (
          <ListRow
            key={p.key}
            title={p.title}
            subtitle={p.subtitle}
            toggle={{ value: current ? current[p.key] : true, onChange: (v) => update(p.key, v), disabled: !current }}
          />
        ))}
      </Group>

      {granted ? (
        <Group footer={Platform.OS === 'android' ? 'Sound and importance per type are in Android notification settings.' : undefined}>
          <ListRow title="Send a test notification" icon="bell" onPress={test} />
          <ListRow title="System notification settings" icon="settings" onPress={() => Linking.openSettings()} />
        </Group>
      ) : null}
    </Screen>
  );
}
