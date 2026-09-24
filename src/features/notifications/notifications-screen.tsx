import { useConvex } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Group, ListRow, LoadingState, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/convex/errors';
import { haptic } from '@/lib/haptics';

import { backgroundStatus, registerMailCheck, showNotifications, unregisterMailCheck } from './background-check';
import { checkMail, convexQuery, loadNotifyPrefs, saveNotifyPrefs, type NotifyPreferences } from './mail-check';
import { requestNotificationPermission } from './push';

export function NotificationsScreen() {
  const toast = useToast();
  const convex = useConvex();
  const [prefs, setPrefs] = useState<NotifyPreferences | null>(null);
  const [permission, setPermission] = useState<string | null>(null);
  const [status, setStatus] = useState<'available' | 'restricted' | 'unavailable' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadNotifyPrefs().then(setPrefs);
    backgroundStatus().then(setStatus);
    if (Platform.OS !== 'web') Notifications.getPermissionsAsync().then((p) => setPermission(p.status));
  }, []);

  if (!prefs || status === null) return <LoadingState />;

  if (Platform.OS === 'web') {
    return (
      <Screen>
        <Card>
          <ThemedText type="body" themeColor="textSecondary">
            Notifications are available in the iOS and Android apps.
          </ThemedText>
        </Card>
      </Screen>
    );
  }

  const save = async (next: NotifyPreferences) => {
    setPrefs(next);
    await saveNotifyPrefs(next);
  };

  const setEnabled = async (enabled: boolean) => {
    setBusy('toggle');
    try {
      if (enabled) {
        const granted = await requestNotificationPermission();
        setPermission(granted ? 'granted' : 'denied');
        if (!granted) {
          toast.show({ message: 'Notifications are turned off for Mailmark in Settings.', tone: 'error' });
          return;
        }
        const next = { ...prefs, enabled: true };
        await save(next);
        // Record what is already there, so only mail from now on is announced.
        await checkMail(convexQuery(convex), { silent: true, prefs: next });
        await registerMailCheck();
        haptic('success');
      } else {
        await save({ ...prefs, enabled: false });
        await unregisterMailCheck();
      }
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const checkNow = async () => {
    setBusy('check');
    try {
      const list = await checkMail(convexQuery(convex), { silent: false, prefs });
      await showNotifications(list);
      toast.show({ message: list.length ? `${list.length} notification${list.length === 1 ? '' : 's'} sent` : 'Nothing new since the last check', icon: 'bell' });
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Group
        title="Notifications"
        footer="Mailmark checks your mailboxes in the background and notifies you about new mail and bounces. Your phone decides when these checks run (usually every 15 minutes or more, less often in Low Power Mode), so alerts are not instant.">
        <ListRow
          title="Background mail checks"
          icon="bell"
          disabled={busy === 'toggle' || status !== 'available'}
          toggle={{ value: prefs.enabled && permission === 'granted', onChange: setEnabled, disabled: busy === 'toggle' || status !== 'available' }}
        />
      </Group>

      {status !== 'available' ? (
        <Card>
          <ThemedText type="small" themeColor="warning">
            Background activity is restricted for Mailmark. Turn on Background App Refresh (iOS) or remove battery restrictions (Android) to receive notifications.
          </ThemedText>
          <Button title="Open Settings" variant="secondary" size="sm" onPress={() => Linking.openSettings()} />
        </Card>
      ) : null}

      {permission === 'denied' ? (
        <Card>
          <ThemedText type="small" themeColor="warning">
            Notifications are turned off for Mailmark in your phone&apos;s settings.
          </ThemedText>
          <Button title="Open Settings" variant="secondary" size="sm" onPress={() => Linking.openSettings()} />
        </Card>
      ) : null}

      <Group title="Notify me about">
        <ListRow
          title="New mail"
          subtitle="Unread messages that arrive in any mailbox"
          toggle={{ value: prefs.newMail, onChange: (v) => save({ ...prefs, newMail: v }), disabled: !prefs.enabled }}
        />
        <ListRow
          title="Bounces & spam reports"
          subtitle="Messages you sent in the last week that did not arrive"
          toggle={{ value: prefs.bounces, onChange: (v) => save({ ...prefs, bounces: v }), disabled: !prefs.enabled }}
        />
      </Group>

      {prefs.enabled && permission === 'granted' ? (
        <Group footer="Checks now and shows anything new, the same way the background check does.">
          <ListRow title={busy === 'check' ? 'Checking…' : 'Check now'} icon="refresh" disabled={busy !== null} onPress={checkNow} />
          <ListRow title="System notification settings" icon="settings" onPress={() => Linking.openSettings()} />
        </Group>
      ) : null}
    </Screen>
  );
}
