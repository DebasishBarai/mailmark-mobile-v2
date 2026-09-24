import { useClerk } from '@clerk/expo';
import { useAction, useConvexAuth } from 'convex/react';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { api } from '@/lib/convex/api';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { User } from '@/lib/convex/types';
import { local } from '@/lib/storage';

type SignOutHook = () => Promise<void>;

type SessionApi = {
  /** Convex has accepted the Clerk token. */
  isAuthenticated: boolean;
  /** Clerk or Convex is still deciding. */
  isLoading: boolean;
  /** The Mailmark user row, once the first sync has created it. */
  user: User | null | undefined;
  /** The session ended without the user asking (revoked or expired). */
  expired: boolean;
  signOut: () => Promise<void>;
  /** Work to run before sign-out, e.g. unregistering this device's push token. */
  registerSignOutHook: (hook: SignOutHook) => () => void;
};

const SessionContext = createContext<SessionApi | null>(null);

/**
 * The signed-in session, as the website's protected layout models it: Clerk
 * authenticates, Convex validates the JWT, and `users.addUser` creates or
 * refreshes the user's row on first authenticated load (SyncUser on web).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const clerk = useClerk();
  const addUser = useAction(api.users.addUser);
  const synced = useRef(false);
  const signingOut = useRef(false);
  const wasAuthenticated = useRef(false);
  const hooks = useRef(new Set<SignOutHook>());
  const [expired, setExpired] = useState(false);

  const current = useLiveQuery(api.users.current, isAuthenticated ? {} : 'skip');

  useEffect(() => {
    if (!isAuthenticated || synced.current) return;
    synced.current = true;
    setExpired(false);
    addUser({}).catch(() => {
      // As on web: the row is not created and the next launch retries.
      synced.current = false;
    });
  }, [isAuthenticated, addUser]);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      wasAuthenticated.current = true;
    } else if (wasAuthenticated.current) {
      wasAuthenticated.current = false;
      synced.current = false;
      if (!signingOut.current) setExpired(true);
      signingOut.current = false;
    }
  }, [isAuthenticated, isLoading]);

  const registerSignOutHook = useCallback((hook: SignOutHook) => {
    hooks.current.add(hook);
    return () => {
      hooks.current.delete(hook);
    };
  }, []);

  const signOut = useCallback(async () => {
    signingOut.current = true;
    for (const hook of hooks.current) {
      try {
        await hook();
      } catch {
        // A failed cleanup must never keep someone signed in.
      }
    }
    await local.remove('lastMailbox');
    await local.remove('drafts');
    await clerk.signOut();
  }, [clerk]);

  const value = useMemo<SessionApi>(
    () => ({
      isAuthenticated,
      isLoading,
      user: isAuthenticated ? current.data : null,
      expired,
      signOut,
      registerSignOutHook,
    }),
    [isAuthenticated, isLoading, current.data, expired, signOut, registerSignOutHook],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionApi {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
