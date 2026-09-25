import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { ConvexReactClient } from 'convex/react';
import { Platform } from 'react-native';

import { api } from '@/lib/convex/api';

import { registerMailCheck, unregisterMailCheck } from './background-check';
import { checkMail, convexQuery, type NotifyPreferences } from './mail-check';
import { setStoredPushToken, storedPushToken } from './push';

/**
 * How notifications reach this device.
 *
 * - `push`: the server sends a push the moment mail arrives
 *   (convex/push.ts in the website repo). Needs a real device and a build
 *   with push credentials (APNs on iOS, Firebase on Android).
 * - `background`: where no push token can be had (simulator, a build without
 *   Firebase, Expo's servers unreachable), the OS-scheduled background check
 *   raises local notifications instead. Late, but better than nothing.
 *
 * Only one runs at a time, so the same email is never announced twice.
 */
export type DeliveryMode = 'push' | 'background' | 'off';

/** The Expo push token for this device, or null where push cannot work. */
async function expoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

async function stopPush(convex: ConvexReactClient) {
  const token = await storedPushToken();
  if (!token) return;
  // Forget the token only once the server has, so a failed call (offline) is
  // retried on the next sync instead of leaving pushes coming.
  await convex.mutation(api.pushTokens.unregister, { token });
  await setStoredPushToken(null);
}

/**
 * Bring this device in line with the saved preferences: register for push
 * (or refresh the server's copy of the preferences), fall back to the
 * background check, or turn both off. Safe to call repeatedly; the app calls
 * it on launch, on every preference change and when the push token rolls.
 */
export async function syncDelivery(
  convex: ConvexReactClient,
  prefs: NotifyPreferences,
): Promise<DeliveryMode> {
  if (Platform.OS === 'web') return 'off';

  const { status } = await Notifications.getPermissionsAsync();
  if (!prefs.enabled || status !== 'granted') {
    await unregisterMailCheck();
    await stopPush(convex).catch(() => {});
    return 'off';
  }

  const token = await expoPushToken();
  if (token) {
    try {
      await convex.mutation(api.pushTokens.register, {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        newMail: prefs.newMail,
        bounces: prefs.bounces,
      });
      await setStoredPushToken(token);
      await unregisterMailCheck();
      return 'push';
    } catch {
      // Server unreachable. If it already has this token from an earlier
      // sync, pushes still arrive; the next sync updates the preferences.
      if ((await storedPushToken()) === token) return 'push';
    }
  }

  await stopPush(convex).catch(() => {});
  // Record what is already there, so only mail from now on is announced.
  await checkMail(convexQuery(convex), { silent: true, prefs }).catch(() => {});
  await registerMailCheck();
  return 'background';
}

/** On sign-out, while the session can still call the server. */
export async function stopDelivery(convex: ConvexReactClient) {
  if (Platform.OS === 'web') return;
  await unregisterMailCheck();
  await stopPush(convex).catch(() => setStoredPushToken(null));
}
