import { getClerkInstance } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { ConvexHttpClient } from 'convex/browser';
import { Platform } from 'react-native';

import { Config } from '@/lib/config';

import { checkMail, convexQuery, loadNotifyPrefs, type LocalNotification } from './mail-check';
import { configureNotifications } from './push';

export const MAIL_CHECK_TASK = 'mailmark-mail-check';

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
 * Background mail check. There is no server push in Mailmark, so the app
 * asks the OS to wake it periodically, reads the newest mail with the same
 * queries the website uses, and raises local notifications for what is new.
 * Timing is up to the OS (iOS schedules it by usage); it is not instant.
 */
TaskManager.defineTask(MAIL_CHECK_TASK, async () => {
  try {
    const prefs = await loadNotifyPrefs();
    if (!prefs.enabled || !Config.convexUrl) return BackgroundTask.BackgroundTaskResult.Success;
    const client = await authenticatedClient();
    if (!client) return BackgroundTask.BackgroundTaskResult.Success;
    const list = await checkMail(convexQuery(client), { silent: false, prefs });
    await showNotifications(list);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

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
