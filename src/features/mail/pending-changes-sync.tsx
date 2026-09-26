import { useConvex, useConvexConnectionState } from 'convex/react';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { useSession } from '@/features/auth/session';
import { errorMessage } from '@/lib/convex/errors';
import { haptic } from '@/lib/haptics';

import { clearMailChanges, flushMailChanges, onMailChangeRejected, setLiveClient } from './pending-changes';

/**
 * Sends mail changes made offline (pending-changes.ts) through the app's
 * Convex client: on sign-in, whenever the connection comes back and on every
 * return to the app. Says so when the server refuses one, and drops what is
 * left on sign-out. Renders nothing.
 */
export function PendingChangesSync() {
  const convex = useConvex();
  const toast = useToast();
  const { isAuthenticated, registerSignOutHook } = useSession();
  const { isWebSocketConnected } = useConvexConnectionState();

  useEffect(() => {
    if (!isAuthenticated) return;
    setLiveClient({
      mutate: (ref, args) => convex.mutation(ref, args as never),
      connected: () => convex.connectionState().isWebSocketConnected,
    });
    return () => setLiveClient(null);
  }, [isAuthenticated, convex]);

  useEffect(() => {
    if (isAuthenticated && isWebSocketConnected) void flushMailChanges();
  }, [isAuthenticated, isWebSocketConnected]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushMailChanges();
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(
    () =>
      onMailChangeRejected(({ error }) => {
        haptic('error');
        toast.show({ message: errorMessage(error, 'Could not update a message.'), tone: 'error', icon: 'warning' });
      }),
    [toast],
  );

  useEffect(() => registerSignOutHook(() => clearMailChanges()), [registerSignOutHook]);

  return null;
}
