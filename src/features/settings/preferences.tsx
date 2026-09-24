import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { local, secure } from '@/lib/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Preferences = {
  theme: ThemePreference;
  /** Require device authentication when returning to the app. */
  appLock: boolean;
  /** Ask before sending a message with no subject or to many recipients. */
  confirmSend: boolean;
  /** Open messages with remote images blocked (tracking pixels). */
  blockRemoteImages: boolean;
};

const DEFAULTS: Preferences = {
  theme: 'system',
  appLock: false,
  confirmSend: true,
  blockRemoteImages: false,
};

type PreferencesApi = {
  prefs: Preferences;
  ready: boolean;
  update: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<PreferencesApi | null>(null);

const APP_LOCK_KEY = 'mailmark.appLock';

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await local.get<Partial<Preferences>>('prefs', {});
      // App lock lives in secure storage so it cannot be switched off by
      // editing an unencrypted file on a compromised device backup.
      const lock = (await secure.get(APP_LOCK_KEY)) === '1';
      if (cancelled) return;
      setPrefs({ ...DEFAULTS, ...stored, appLock: lock });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || process.env.EXPO_OS === 'web') return;
    Appearance.setColorScheme(prefs.theme === 'system' ? 'unspecified' : prefs.theme);
  }, [prefs.theme, ready]);

  const update = useCallback<PreferencesApi['update']>((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      const { appLock, ...rest } = next;
      void local.set('prefs', rest);
      if (key === 'appLock') void secure.set(APP_LOCK_KEY, appLock ? '1' : '0');
      return next;
    });
  }, []);

  const value = useMemo(() => ({ prefs, ready, update }), [prefs, ready, update]);

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences(): PreferencesApi {
  const ctx = use(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}
