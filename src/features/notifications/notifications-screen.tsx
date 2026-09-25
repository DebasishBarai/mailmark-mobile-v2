import { useAction, useConvex } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Group, ListRow, LoadingState, Screen } from '@/components/ui';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { haptic } from '@/lib/haptics';

import { backgroundStatus, showNotifications } from './background-check';
import { syncDelivery, type DeliveryMode } from './delivery';
import { checkMail, convexQuery, loadNotifyPrefs, saveNotifyPrefs, type NotifyPreferences } from './mail-check';
import { requestNotificationPermission, storedPushToken } from './push';

export function NotificationsScreen() {
  const toast = useToast();
  const convex = useConvex();
  const sendTest = useAction(api.pushTokens.sendTest);
  const [prefs, setPrefs] = useState<NotifyPreferences | null>(null);
  const [permission, setPermission] = useState<string | null>(null);
  const [status, setStatus] = useState<'available' | 'restricted' | 'unavailable' | null>(null);
  const [mode, setMode] = useState<DeliveryMode | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void loadNotifyPrefs().then(async (p) => {
      setPrefs(p);
      setMode(!p.enabled ? 'off' : (await storedPushToken()) ? 'push' : 'background');
    });
    backgroundStatus().then(setStatus);
    if (Platform.OS !== 'web') Notifications.getPermissionsAsync().then((p) => setPermission(p.status));
  }, []);

  if (!prefs || status === null || mode === null) return <LoadingState />;

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

  const apply = async (next: NotifyPreferences) => {
    setPrefs(next);
    await saveNotifyPrefs(next);
    setMode(await syncDelivery(convex, next));
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
        await apply({ ...prefs, enabled: true });
        haptic('success');
      } else {
        await apply({ ...prefs, enabled: false });
      }
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const setPref = async (next: NotifyPreferences) => {
    try {
      await apply(next);
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    }
  };

  const test = async () => {
    setBusy('check');
    try {
      const { sent } = await sendTest({});
      toast.show({ message: sent ? 'Test notification sent' : 'This device is not registered yet', icon: 'bell' });
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

  const on = prefs.enabled && permission === 'granted';

  return (
    <Screen>
      <Group
        title="Notifications"
        footer={
          mode === 'push'
            ? 'You are notified the moment new mail arrives or a message bounces.'
            : mode === 'background'
              ? 'Instant notifications are not available on this device, so Mailmark checks your mailboxes in the background instead. Your phone decides when these checks run (usually every 15 minutes or more), so alerts are not instant.'
              : 'Get notified about new mail and bounces.'
        }>
        <ListRow
          title="Notifications"
          subtitle={on ? (mode === 'push' ? 'Instant' : 'Background checks') : undefined}
          icon="bell"
          disabled={busy === 'toggle'}
          toggle={{ value: on, onChange: setEnabled, disabled: busy === 'toggle' }}
        />
      </Group>

      {on && mode === 'background' && status !== 'available' ? (
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
          toggle={{ value: prefs.newMail, onChange: (v) => setPref({ ...prefs, newMail: v }), disabled: !prefs.enabled }}
        />
        <ListRow
          title="Bounces & spam reports"
          subtitle="Messages you sent that did not arrive"
          toggle={{ value: prefs.bounces, onChange: (v) => setPref({ ...prefs, bounces: v }), disabled: !prefs.enabled }}
        />
      </Group>

      {on ? (
        <Group
          footer={
            mode === 'push'
              ? 'Sends a notification to this device through the server.'
              : 'Checks now and shows anything new, the same way the background check does.'
          }>
          {mode === 'push' ? (
            <ListRow title={busy === 'check' ? 'Sending…' : 'Send test notification'} icon="bell" disabled={busy !== null} onPress={test} />
          ) : (
            <ListRow title={busy === 'check' ? 'Checking…' : 'Check now'} icon="refresh" disabled={busy !== null} onPress={checkNow} />
          )}
          <ListRow title="System notification settings" icon="settings" onPress={() => Linking.openSettings()} />
        </Group>
      ) : null}
    </Screen>
  );
}
