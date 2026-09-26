import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { ConvexReactClient } from 'convex/react';
import { Platform } from 'react-native';

import { api } from '@/lib/convex/api';
import { local } from '@/lib/storage';

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

const FORGET_KEY = 'pushTokensToForget';
/**
 * How long to wait on the server. Offline, the Convex client holds a
 * mutation until it reconnects rather than failing it, so without a limit
 * sign-out and the settings toggle would hang. A call that times out still
 * goes through once the connection is back.
 */
const SERVER_TIMEOUT_MS = 5000;

type Outcome = 'done' | 'failed' | 'pending';

/** Whether `call` succeeded, was rejected, or is still waiting for a connection. */
function withinTimeout(call: Promise<unknown>): Promise<Outcome> {
  return Promise.race([
    call.then(
      () => 'done' as const,
      () => 'failed' as const,
    ),
    new Promise<Outcome>((resolve) => setTimeout(() => resolve('pending'), SERVER_TIMEOUT_MS)),
  ]);
}

/**
 * Registering and forgetting run one at a time, in call order, so a retried
 * "forget" can never overtake a newer registration of the same token (sign
 * out offline, then sign back in on the same phone).
 */
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => {});
  return run;
}

async function forgetList(): Promise<string[]> {
  return local.get<string[]>(FORGET_KEY, []);
}

/**
 * Send the queued "stop pushing to this device" calls. They need no session
 * (pushTokens.unregisterDevice takes the token as proof), so they keep
 * working after sign-out. Whatever does not land stays queued for the next
 * launch or return to the app.
 */
async function flushForgetList(convex: ConvexReactClient) {
  for (const token of await forgetList()) {
    // One that does not land means no connection: leave the rest for later.
    const outcome = await withinTimeout(convex.mutation(api.pushTokens.unregisterDevice, { token }));
    if (outcome !== 'done') return;
    await local.set(FORGET_KEY, (await forgetList()).filter((t) => t !== token));
  }
}

/** Stop pushes to this device, now if the server is reachable, else later. */
async function stopPush(convex: ConvexReactClient) {
  const token = await storedPushToken();
  if (token) {
    const list = await forgetList();
    if (!list.includes(token)) await local.set(FORGET_KEY, [...list, token]);
    await setStoredPushToken(null);
  }
  await flushForgetList(convex);
}

/** Retry removals a sign-out or switch-off could not send. Signed in or not. */
export function retryForgottenTokens(convex: ConvexReactClient): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return serial(() => flushForgetList(convex)).catch(() => {});
}

/**
 * Bring this device in line with the saved preferences: register for push
 * (or refresh the server's copy of the preferences), fall back to the
 * background check, or turn both off. Safe to call repeatedly; the app calls
 * it on launch, on every preference change and when the push token rolls.
 */
export function syncDelivery(convex: ConvexReactClient, prefs: NotifyPreferences): Promise<DeliveryMode> {
  if (Platform.OS === 'web') return Promise.resolve('off');
  return serial(() => sync(convex, prefs));
}

async function sync(convex: ConvexReactClient, prefs: NotifyPreferences): Promise<DeliveryMode> {
  const { status } = await Notifications.getPermissionsAsync();
  if (!prefs.enabled || status !== 'granted') {
    await unregisterMailCheck();
    await stopPush(convex);
    return 'off';
  }

  const token = await expoPushToken();
  if (token) {
    // A queued removal of this same token is superseded by registering it.
    await local.set(FORGET_KEY, (await forgetList()).filter((t) => t !== token));
    const register = (displaysSilentPush: boolean) =>
      withinTimeout(
        convex.mutation(api.pushTokens.register, {
          token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          newMail: prefs.newMail,
          bounces: prefs.bounces,
          ...(displaysSilentPush ? { displaysSilentPush } : {}),
        }),
      );
    // Android asks for silent pushes, which it shows itself with their
    // buttons (background-check.ts). A server that predates the field rejects
    // the call, so it is retried without; pushes then come without buttons.
    const android = Platform.OS === 'android';
    let outcome = await register(android);
    if (outcome === 'failed' && android) outcome = await register(false);
    // 'pending' is a call waiting for the connection: it lands then, so this
    // device is in push mode (starting the background check too would
    // announce mail twice). 'failed' with the token registered by an earlier
    // sync: pushes still arrive, and the next sync retries.
    if (outcome !== 'failed' || (await storedPushToken()) === token) {
      await setStoredPushToken(token);
      await unregisterMailCheck();
      return 'push';
    }
  }

  await stopPush(convex);
  // Record what is already there, so only mail from now on is announced.
  await checkMail(convexQuery(convex), { silent: true, prefs }).catch(() => {});
  await registerMailCheck();
  return 'background';
}

/**
 * On sign-out, before the session ends. Waits at most SERVER_TIMEOUT_MS per
 * call; a removal that cannot be sent now is retried on the next launch,
 * signed in or not.
 */
export function stopDelivery(convex: ConvexReactClient): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  return serial(async () => {
    await unregisterMailCheck();
    await stopPush(convex);
  }).catch(() => {});
}
