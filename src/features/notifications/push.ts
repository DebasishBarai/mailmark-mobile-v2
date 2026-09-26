import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { local } from '@/lib/storage';

/** What the app puts in a notification's `data`, read back when it is tapped. */
export type PushData = {
  /** App path to open, e.g. "/email/<id>" or "/campaign/<batchId>". */
  url?: string;
  type?: 'new_mail' | 'reply' | 'bounce' | 'delivery_issue' | 'campaign_completed' | 'campaign_error' | 'account' | 'billing' | 'test';
  emailId?: string;
  mailboxId?: string;
  folder?: string;
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
  open: 'open',
  reply: 'reply',
  markRead: 'mark_read',
  view: 'view',
} as const;

const PUSH_TOKEN_KEY = 'pushToken';

/** The Expo push token registered with the server, or null in background-check mode. */
export async function storedPushToken(): Promise<string | null> {
  return local.get<string | null>(PUSH_TOKEN_KEY, null);
}

export async function setStoredPushToken(token: string | null) {
  if (token) await local.set(PUSH_TOKEN_KEY, token);
  else await local.remove(PUSH_TOKEN_KEY);
}

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
    { identifier: ACTIONS.markRead, buttonTitle: 'Mark as read', options: { opensAppToForeground: false } },
    { identifier: ACTIONS.reply, buttonTitle: 'Reply', options: { opensAppToForeground: true } },
    { identifier: ACTIONS.open, buttonTitle: 'Open', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORIES.campaign, [
    { identifier: ACTIONS.view, buttonTitle: 'View campaign', options: { opensAppToForeground: true } },
  ]);
}

/** Ask for permission to show notifications. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await configureNotifications();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  return status === 'granted';
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
