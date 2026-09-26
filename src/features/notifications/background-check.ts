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
import { ACTIONS, configureNotifications, storedPushToken, type PushData } from './push';

export const MAIL_CHECK_TASK = 'mailmark-mail-check';
export const NOTIFICATION_ACTION_TASK = 'mailmark-notification-action';

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

/** Buttons that act on the email without opening the app. */
const BACKGROUND_ACTIONS: string[] = [ACTIONS.markRead, ACTIONS.trash];
const handled = new Set<string>();

/**
 * The Mark as read and Trash buttons. They do not open the app, so they cannot
 * rely on the React tree being mounted or signed in: they use the stored Clerk
 * session and an HTTP client, like the background check. A notification is
 * handled once even if both the listener and the Android task report it.
 */
async function handleBackgroundAction(response: Notifications.NotificationResponse) {
  const { identifier, content } = response.notification.request;
  const data = (content.data ?? {}) as PushData;
  const action = response.actionIdentifier;
  if (!BACKGROUND_ACTIONS.includes(action) || !data.emailId || handled.has(identifier)) return;
  handled.add(identifier);
  try {
    const client = await authenticatedClient();
    if (!client) return;
    const emailId = data.emailId as Id<'emails'>;
    if (action === ACTIONS.trash) await client.mutation(api.emails.moveToFolder, { emailId, folder: 'trash' });
    else await client.mutation(api.emails.markAsRead, { emailId });
    await Notifications.dismissNotificationAsync(identifier);
    // Either way the message no longer counts as unread in the inbox.
    const badge = await Notifications.getBadgeCountAsync();
    if (badge > 0) await Notifications.setBadgeCountAsync(badge - 1);
  } catch {
    handled.delete(identifier);
  }
}

/**
 * On Android an action tapped while the app is in the background or closed is
 * delivered only to this task; on iOS it reaches the response listener below.
 */
TaskManager.defineTask<Notifications.NotificationTaskPayload>(NOTIFICATION_ACTION_TASK, async ({ data }) => {
  if (data && 'actionIdentifier' in data) await handleBackgroundAction(data);
});

if (Platform.OS !== 'web') {
  Notifications.addNotificationResponseReceivedListener((response) => void handleBackgroundAction(response));
  // The button that launched the app from a closed state. Cleared so it is not
  // replayed later on an email the user has since changed.
  const initial = Notifications.getLastNotificationResponse();
  if (initial && BACKGROUND_ACTIONS.includes(initial.actionIdentifier)) {
    void handleBackgroundAction(initial);
    void Notifications.clearLastNotificationResponseAsync();
  }
  if (Platform.OS === 'android') Notifications.registerTaskAsync(NOTIFICATION_ACTION_TASK).catch(() => {});
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
