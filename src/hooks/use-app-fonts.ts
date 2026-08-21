import { useFonts } from 'expo-font';

/**
 * The three families mailmark.dev is set in: Schibsted Grotesk for UI text,
 * Fraunces for display headings, DM Mono for code and metrics.
 */
export function useAppFonts() {
  const [loaded, error] = useFonts({
    'SchibstedGrotesk-Regular': require('@/assets/fonts/SchibstedGrotesk-Regular.ttf'),
    'SchibstedGrotesk-Medium': require('@/assets/fonts/SchibstedGrotesk-Medium.ttf'),
    'SchibstedGrotesk-SemiBold': require('@/assets/fonts/SchibstedGrotesk-SemiBold.ttf'),
    'SchibstedGrotesk-Bold': require('@/assets/fonts/SchibstedGrotesk-Bold.ttf'),
    'SchibstedGrotesk-ExtraBold': require('@/assets/fonts/SchibstedGrotesk-ExtraBold.ttf'),
    'Fraunces-SemiBold': require('@/assets/fonts/Fraunces-SemiBold.ttf'),
    'Fraunces-Bold': require('@/assets/fonts/Fraunces-Bold.ttf'),
    'DMMono-Regular': require('@/assets/fonts/DMMono-Regular.ttf'),
    'DMMono-Medium': require('@/assets/fonts/DMMono-Medium.ttf'),
  });

  return loaded || !!error;
}
