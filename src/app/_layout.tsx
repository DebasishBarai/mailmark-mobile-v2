import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConnectionBanner } from '@/components/feedback/connection-banner';
import { Colors } from '@/constants/theme';
import { ConnectingScreen, useClerkFailed } from '@/features/auth/connecting-screen';
import { useSession } from '@/features/auth/session';
import { PendingChangesSync } from '@/features/mail/pending-changes-sync';
import { NotificationObserver } from '@/features/notifications/notification-observer';
import { AppLockGate } from '@/features/settings/app-lock';
import { ConfigMissingScreen } from '@/features/settings/config-missing';
import { PreferencesProvider } from '@/features/settings/preferences';
import { WorkspaceProvider } from '@/features/workspace/workspace';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { useStackOptions } from '@/hooks/use-stack-options';
import { useColorSchemeName } from '@/hooks/use-theme';
import { missingConfig } from '@/lib/config';
import { AppProviders } from '@/providers/app-providers';

SplashScreen.preventAutoHideAsync();

const STARTUP_TIMEOUT_MS = 8000;

export const unstable_settings = {
  anchor: '(app)',
};

const navigationTheme = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.accent,
      background: Colors.light.background,
      card: Colors.light.background,
      text: Colors.light.text,
      border: Colors.light.border,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.accent,
      background: Colors.dark.background,
      card: Colors.dark.background,
      text: Colors.dark.text,
      border: Colors.dark.border,
    },
  },
};

export default function RootLayout() {
  const scheme = useColorSchemeName();
  const fontsReady = useAppFonts();
  const missing = missingConfig();

  useEffect(() => {
    if (fontsReady && missing.length > 0) SplashScreen.hideAsync();
  }, [fontsReady, missing.length]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
        <ThemeProvider value={navigationTheme[scheme]}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          {missing.length > 0 ? (
            <ConfigMissingScreen missing={missing} />
          ) : (
            <PreferencesProvider>
              <AppProviders>
                <WorkspaceProvider>
                  <RootNavigator />
                  <PendingChangesSync />
                  <NotificationObserver />
                  <ConnectionBanner />
                  <AppLockGate />
                </WorkspaceProvider>
              </AppProviders>
            </PreferencesProvider>
          )}
        </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useSession();
  const stackOptions = useStackOptions();
  const clerkFailed = useClerkFailed();

  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      return;
    }
    if (clerkFailed) {
      SplashScreen.hideAsync();
      return;
    }
    const timer = setTimeout(() => {
      setSlow(true);
      SplashScreen.hideAsync();
    }, STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLoading, clerkFailed]);

  // Keep the splash up while Clerk restores the session from secure storage,
  // so a signed-in user never sees the sign-in screen flash past. If that
  // takes too long, or Clerk fails outright, say so rather than leaving a
  // frozen splash.
  if (isLoading) return slow || clerkFailed ? <ConnectingScreen /> : null;

  return (
    <Stack screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="compose"
          options={{ presentation: 'modal', headerShown: true, gestureEnabled: false }}
        />
        <Stack.Screen name="campaign-new" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="add-domain" options={{ presentation: 'modal', headerShown: true, title: 'Add domain' }} />
        <Stack.Screen name="new-mailbox" options={{ presentation: 'modal', headerShown: true, title: 'New mailbox' }} />
        <Stack.Screen name="new-api-key" options={{ presentation: 'modal', headerShown: true, title: 'New API key' }} />
        <Stack.Screen name="sender-group" options={{ presentation: 'modal', headerShown: true, title: 'Sender group' }} />
        <Stack.Screen name="signature" options={{ presentation: 'modal', headerShown: true, title: 'Signature' }} />
        <Stack.Screen
          name="mailbox-picker"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetAllowedDetents: [0.5, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
