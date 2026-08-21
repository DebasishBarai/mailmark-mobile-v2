import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { useColorSchemeName } from '@/hooks/use-theme';
import { useStackOptions } from '@/hooks/use-stack-options';
import { WorkspaceProvider, useWorkspace } from '@/store/workspace';

SplashScreen.preventAutoHideAsync();

/** Mailmark's palettes, handed to the navigation theme so headers match. */
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

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme[scheme]}>
          <WorkspaceProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <RootNavigator />
          </WorkspaceProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { signedIn } = useWorkspace();
  const stackOptions = useStackOptions();

  return (
    <Stack screenOptions={{ ...stackOptions, headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(marketing)" />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(workspace)" />
        <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
        <Stack.Screen name="new-campaign" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-domain" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}
