import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { ReactNode } from 'react';

import { ActionSheetProvider } from '@/components/feedback/action-sheet';
import { ToastProvider } from '@/components/feedback/toast';
import { SessionProvider } from '@/features/auth/session';
import { Config } from '@/lib/config';

/**
 * Created once for the life of the app. The client keeps a single WebSocket
 * to the deployment, re-subscribes after reconnects, and queues mutations
 * made while offline until the socket is back.
 */
const convex = Config.convexUrl
  ? new ConvexReactClient(Config.convexUrl, { unsavedChangesWarning: false })
  : null;

/**
 * Clerk (the same instance the website signs in with) owns the session; its
 * token cache persists the client token in the Keychain / Keystore through
 * expo-secure-store. Convex asks Clerk for a fresh JWT from the "convex"
 * template whenever it needs one, exactly as the website's
 * ConvexClientProvider does.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>;

  return (
    <ClerkProvider publishableKey={Config.clerkPublishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SessionProvider>
          <ActionSheetProvider>
            <ToastProvider>{children}</ToastProvider>
          </ActionSheetProvider>
        </SessionProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
