import { useMutation } from 'convex/react';
import * as Device from 'expo-device';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useSession } from '@/features/auth/session';
import { api } from '@/lib/convex/api';
import { useMobileCapabilities } from '@/lib/convex/hooks';
import { local } from '@/lib/storage';

import { getPushToken, type RegisterResult } from './push';

export type { RegisterResult };

const REGISTERED_KEY = 'pushRegistration';

/**
 * Keeps this device's push token registered with the backend for the
 * signed-in user, and unregisters it on sign-out so a shared or handed-down
 * phone stops receiving someone else's mail notifications.
 */
export function usePushRegistration() {
  const { isAuthenticated, user, registerSignOutHook } = useSession();
  const caps = useMobileCapabilities();
  const register = useMutation(api.mobile.registerPushToken);
  const unregister = useMutation(api.mobile.unregisterPushToken);
  const token = useRef<string | null>(null);

  const enable = useCallback(
    async (prompt: boolean) => {
      if (!caps?.push || !user) return null;
      const result = await getPushToken(prompt);
      if (!result.ok) return result;
      token.current = result.token;
      const stamp = `${user._id}:${result.token}`;
      if ((await local.get<string | null>(REGISTERED_KEY, null)) !== stamp) {
        await register({
          token: result.token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceName: Device.deviceName ?? Device.modelName ?? undefined,
        });
        await local.set(REGISTERED_KEY, stamp);
      }
      return result;
    },
    [caps?.push, user, register],
  );

  // Silent registration when permission was already granted.
  useEffect(() => {
    if (isAuthenticated && caps?.push && user) void enable(false).catch(() => {});
  }, [isAuthenticated, caps?.push, user, enable]);

  useEffect(
    () =>
      registerSignOutHook(async () => {
        if (token.current && caps?.push) await unregister({ token: token.current });
        await local.remove(REGISTERED_KEY);
      }),
    [registerSignOutHook, unregister, caps?.push],
  );

  return { enable, available: !!caps?.push, capabilitiesLoaded: caps !== undefined };
}
