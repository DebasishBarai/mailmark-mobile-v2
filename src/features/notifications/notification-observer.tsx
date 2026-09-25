import { useConvex } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useSession } from '@/features/auth/session';
import { useWorkspace } from '@/features/workspace/workspace';

// Importing this module (through delivery.ts) defines the background tasks
// at startup, which the OS requires before it can run them, and handles
// Mark as read.
import { stopDelivery, syncDelivery } from './delivery';
import { checkMail, clearNotifyState, convexQuery, loadNotifyPrefs } from './mail-check';
import { ACTIONS, configureNotifications, safeAppPath, storedPushToken, type PushData } from './push';

/**
 * Registers this device for push (or the background check where push is
 * unavailable), routes notification taps and the Open and Reply actions into
 * the app, keeps the background check's "seen" marker current while the app
 * is open, and mirrors the unread count onto the app icon badge. Renders
 * nothing.
 */
export function NotificationObserver() {
  if (Platform.OS === 'web') return null;
  return <Observer />;
}

function Observer() {
  const convex = useConvex();
  const { isAuthenticated, registerSignOutHook } = useSession();
  const { totalUnread } = useWorkspace();
  const handledInitial = useRef(false);

  useEffect(() => {
    void configureNotifications();
  }, []);

  useEffect(
    () =>
      registerSignOutHook(async () => {
        await stopDelivery(convex);
        await clearNotifyState();
        await Notifications.setBadgeCountAsync(0);
      }),
    [registerSignOutHook, convex],
  );

  // Register with the server on every launch: it re-creates a token the
  // server dropped, and applies preferences a failed call left behind. A
  // push token the OS rolls while the app runs is registered right away.
  useEffect(() => {
    if (!isAuthenticated) return;
    const sync = () => {
      void loadNotifyPrefs().then((prefs) => syncDelivery(convex, prefs)).catch(() => {});
    };
    sync();
    const sub = Notifications.addPushTokenListener(sync);
    return () => sub.remove();
  }, [isAuthenticated, convex]);

  // In background-check mode, whatever is on screen when the app is left
  // counts as seen, so the next check only announces mail after that.
  useEffect(() => {
    if (!isAuthenticated) return;
    const sync = async () => {
      const prefs = await loadNotifyPrefs();
      if (!prefs.enabled || (await storedPushToken())) return;
      await checkMail(convexQuery(convex), { silent: true, prefs }).catch(() => {});
    };
    void sync();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'active') void sync();
    });
    return () => sub.remove();
  }, [isAuthenticated, convex]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handle = (response: Notifications.NotificationResponse) => {
      const data = (response.notification.request.content.data ?? {}) as PushData;
      const action = response.actionIdentifier;

      // Handled in background-check.ts, which works without the app open.
      if (action === ACTIONS.markRead) return;
      if (action === ACTIONS.reply && data.emailId) {
        router.push({
          pathname: '/compose',
          params: { mode: 'reply', emailId: data.emailId, ...(data.mailboxId ? { mailboxId: data.mailboxId } : {}), ...(data.folder ? { folder: data.folder } : {}) },
        });
        return;
      }
      const path = safeAppPath(data.url);
      if (path) router.push(path as never);
    };

    // The tap that launched the app from a killed state.
    if (!handledInitial.current) {
      handledInitial.current = true;
      const initial = Notifications.getLastNotificationResponse();
      if (initial) {
        handle(initial);
        void Notifications.clearLastNotificationResponseAsync();
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Notifications.setBadgeCountAsync(totalUnread).catch(() => {});
  }, [isAuthenticated, totalUnread]);

  return null;
}
