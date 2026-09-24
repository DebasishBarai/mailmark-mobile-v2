import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * The contract between the backend's notification sender
 * (backend/convex/pushNotifications.ts) and the app. The backend puts these
 * in the Expo push message's `data`, `channelId` and `categoryId`.
 */
export type PushData = {
  /** App path to open, e.g. "/email/<id>" or "/campaign/<batchId>". */
  url?: string;
  type?: 'new_mail' | 'reply' | 'bounce' | 'delivery_issue' | 'campaign_completed' | 'campaign_error' | 'account' | 'billing';
  emailId?: string;
  mailboxId?: string;
  batchId?: string;
};

export const CHANNELS = {
  mail: 'mail',
  campaigns: 'campaigns',
  account: 'account',
} as const;

export const CATEGORIES = {
  email: 'email_message',
  campaign: 'campaign_update',
} as const;

export const ACTIONS = {
  reply: 'reply',
  markRead: 'mark_read',
  view: 'view',
} as const;

let configured = false;

/** Handler, Android channels and actionable categories. Safe to call repeatedly. */
export async function configureNotifications() {
  if (configured || Platform.OS === 'web') return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNELS.mail, {
      name: 'New mail and replies',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#ce3a1b',
    });
    await Notifications.setNotificationChannelAsync(CHANNELS.campaigns, {
      name: 'Campaigns and delivery',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(CHANNELS.account, {
      name: 'Account and billing',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.setNotificationCategoryAsync(CATEGORIES.email, [
    { identifier: ACTIONS.reply, buttonTitle: 'Reply', options: { opensAppToForeground: true } },
    { identifier: ACTIONS.markRead, buttonTitle: 'Mark as read', options: { opensAppToForeground: false } },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORIES.campaign, [
    { identifier: ACTIONS.view, buttonTitle: 'View campaign', options: { opensAppToForeground: true } },
  ]);
}

export type RegisterResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'denied' | 'simulator' | 'no-project-id' | 'web' | 'error'; message?: string };

export function easProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Ask for permission (if `prompt`) and fetch this device's Expo push token. */
export async function getPushToken(prompt: boolean): Promise<RegisterResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'web' };
  if (!Device.isDevice) return { ok: false, reason: 'simulator' };
  await configureNotifications();

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && prompt) {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return { ok: false, reason: 'denied' };

  const projectId = easProjectId();
  if (!projectId) return { ok: false, reason: 'no-project-id' };
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { ok: true, token: data };
  } catch (err) {
    return { ok: false, reason: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

/** Only in-app paths are followed from a notification, never arbitrary URLs. */
export function safeAppPath(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const path = url.replace(/^mailmark:\/\//, '/').replace(/^\/+/, '/');
  return /^\/(email|thread|campaign|sequence|mailbox|domain)\/[A-Za-z0-9_%.-]+(\?.*)?$/.test(path) ||
    /^\/(billing|deliverability|warmup|insights|campaigns|domains|suppressions)$/.test(path)
    ? path
    : null;
}
