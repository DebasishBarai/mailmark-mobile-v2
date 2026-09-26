import { getClerkInstance } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { ConvexHttpClient } from 'convex/browser';
import { Platform } from 'react-native';

import { Config } from '@/lib/config';
import { api } from '@/lib/convex/api';
import type { Id } from '@/lib/convex/types';

import { checkMail, convexQuery, loadNotifyPrefs, type LocalNotification } from './mail-check';
import { ACTIONS, CHANNELS, configureNotifications, storedPushToken, type PushData } from './push';

export const MAIL_CHECK_TASK = 'mailmark-mail-check';
/** Android only: notification buttons and incoming silent pushes. Named for the first. */
export const NOTIFICATION_TASK = 'mailmark-notification-action';

/** The shortest interval the OS will honour; iOS may run the task less often. */
const MINIMUM_INTERVAL_MINUTES = 15;

async function waitForClerk() {
  const clerk = getClerkInstance({ publishableKey: Config.clerkPublishableKey, tokenCache });
  for (let i = 0; i < 30 && !clerk.loaded; i++) await new Promise((r) => setTimeout(r, 500));
  if (!clerk.loaded) await clerk.load();
  return clerk;
}

/** A Convex client authenticated as the signed-in user, or null if signed out. */
async function authenticatedClient(): Promise<ConvexHttpClient | null> {
  const clerk = await waitForClerk();
  const token = await clerk.session?.getToken({ template: 'convex' });
  if (!token) return null;
  const client = new ConvexHttpClient(Config.convexUrl);
  client.setAuth(token);
  return client;
}

export async function showNotifications(list: LocalNotification[]) {
  await configureNotifications();
  for (const n of list) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, data: n.data, categoryIdentifier: n.categoryIdentifier, sound: true },
      trigger: Platform.OS === 'android' ? { channelId: n.channelId } : null,
    });
  }
}

/**
 * Background mail check, the fallback where server push is unavailable (see
 * delivery.ts). The app asks the OS to wake it periodically, reads the newest mail with the same
 * queries the website uses, and raises local notifications for what is new.
 * Timing is up to the OS (iOS schedules it by usage); it is not instant.
 */
TaskManager.defineTask(MAIL_CHECK_TASK, async () => {
  try {
    const prefs = await loadNotifyPrefs();
    if (!prefs.enabled || !Config.convexUrl) return BackgroundTask.BackgroundTaskResult.Success;
    // The server pushes instead; checking too would announce mail twice.
    if (await storedPushToken()) return BackgroundTask.BackgroundTaskResult.Success;
    const client = await authenticatedClient();
    if (!client) return BackgroundTask.BackgroundTaskResult.Success;
    const list = await checkMail(convexQuery(client), { silent: false, prefs });
    await showNotifications(list);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

const markedRead = new Set<string>();

/**
 * The Mark as read button. It does not open the app, so it cannot rely on the
 * React tree being mounted or signed in: it uses the stored Clerk session and
 * an HTTP client, like the background check. A notification is handled once
 * even if both the listener and the Android task report it.
 */
async function markReadFromNotification(response: Notifications.NotificationResponse) {
  const { identifier, content } = response.notification.request;
  const data = (content.data ?? {}) as PushData;
  if (response.actionIdentifier !== ACTIONS.markRead || !data.emailId || markedRead.has(identifier)) return;
  markedRead.add(identifier);
  try {
    const client = await authenticatedClient();
    if (!client) return;
    await client.mutation(api.emails.markAsRead, { emailId: data.emailId as Id<'emails'> });
    await Notifications.dismissNotificationAsync(identifier);
    const badge = await Notifications.getBadgeCountAsync();
    if (badge > 0) await Notifications.setBadgeCountAsync(badge - 1);
  } catch {
    markedRead.delete(identifier);
  }
}

/** What the server puts in `data.display` of a silent push. */
type Display = { title?: string; body?: string; badge?: number; channelId?: string; categoryId?: string };

/**
 * A silent push, shown as a local notification. Android draws an ordinary
 * push itself while the app is in the background or closed, without the
 * category's buttons, so the server sends this app data-only pushes instead
 * (forDevice in the website's convex/lib/push.ts) and it shows them here,
 * buttons included. The rest of `data` is what a tap or button reads back.
 */
async function showSilentPush(payload: { data?: { dataString?: string } }) {
  let data: Record<string, string>;
  let shown: Display;
  try {
    data = JSON.parse(payload.data?.dataString ?? '');
    shown = JSON.parse(data.display);
  } catch {
    return;
  }
  if (!shown?.title && !shown?.body) return;
  const { display: _display, ...rest } = data;
  await showNotifications([
    {
      title: shown.title ?? '',
      body: shown.body ?? '',
      data: rest,
      channelId: shown.channelId ?? CHANNELS.mail,
      categoryIdentifier: shown.categoryId,
    },
  ]);
  if (typeof shown.badge === 'number') await Notifications.setBadgeCountAsync(shown.badge).catch(() => {});
}

/**
 * On Android an action tapped while the app is in the background or closed is
 * delivered only to this task (on iOS it reaches the response listener
 * below), and so is every incoming push, open or not.
 */
TaskManager.defineTask<Notifications.NotificationTaskPayload>(NOTIFICATION_TASK, async ({ data }) => {
  if (!data) return;
  if ('actionIdentifier' in data) await markReadFromNotification(data);
  else await showSilentPush(data);
});

if (Platform.OS !== 'web') {
  Notifications.addNotificationResponseReceivedListener((response) => void markReadFromNotification(response));
  // The button that launched the app from a closed state. Cleared so it is not
  // replayed later on an email the user has since marked unread.
  const initial = Notifications.getLastNotificationResponse();
  if (initial?.actionIdentifier === ACTIONS.markRead) {
    void markReadFromNotification(initial);
    void Notifications.clearLastNotificationResponseAsync();
  }
  if (Platform.OS === 'android') Notifications.registerTaskAsync(NOTIFICATION_TASK).catch(() => {});
}

export async function registerMailCheck() {
  if (Platform.OS === 'web') return;
  if (!(await TaskManager.isTaskRegisteredAsync(MAIL_CHECK_TASK))) {
    await BackgroundTask.registerTaskAsync(MAIL_CHECK_TASK, { minimumInterval: MINIMUM_INTERVAL_MINUTES });
  }
}

export async function unregisterMailCheck() {
  if (Platform.OS === 'web') return;
  if (await TaskManager.isTaskRegisteredAsync(MAIL_CHECK_TASK)) {
    await BackgroundTask.unregisterTaskAsync(MAIL_CHECK_TASK);
  }
}

export async function backgroundStatus(): Promise<'available' | 'restricted' | 'unavailable'> {
  if (Platform.OS === 'web') return 'unavailable';
  const status = await BackgroundTask.getStatusAsync();
  return status === BackgroundTask.BackgroundTaskStatus.Available ? 'available' : 'restricted';
}
