import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Two stores, chosen by sensitivity.
 *
 * - `local` (AsyncStorage): preferences and drafts. Unencrypted, so nothing
 *   here may grant access to an account.
 * - `secure` (Keychain / Android Keystore via expo-secure-store): anything
 *   security-relevant. Clerk's session token goes through its own secure
 *   token cache, not through here; API keys are never persisted at all.
 */

const PREFIX = 'mailmark:';

export const local = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable: a lost preference is not worth an error.
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  },
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX)));
    } catch {
      // ignore
    }
  },
};

const secureAvailable = process.env.EXPO_OS !== 'web';

export const secure = {
  async get(key: string): Promise<string | null> {
    if (!secureAvailable) return null;
    try {
      return await SecureStore.getItemAsync(key.replace(/[^A-Za-z0-9._-]/g, '_'));
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (!secureAvailable) return;
    await SecureStore.setItemAsync(key.replace(/[^A-Za-z0-9._-]/g, '_'), value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async remove(key: string): Promise<void> {
    if (!secureAvailable) return;
    try {
      await SecureStore.deleteItemAsync(key.replace(/[^A-Za-z0-9._-]/g, '_'));
    } catch {
      // ignore
    }
  },
};
