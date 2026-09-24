import { useMutation } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useSession } from '@/features/auth/session';
import { useWorkspace } from '@/features/workspace/workspace';
import { api } from '@/lib/convex/api';
import type { Id } from '@/lib/convex/types';

import { ACTIONS, configureNotifications, safeAppPath, type PushData } from './push';
import { usePushRegistration } from './use-push-registration';

/**
 * Routes notification taps and actions into the app, keeps the push token
 * registered, and mirrors the unread count onto the app icon badge.
 * Renders nothing.
 */
export function NotificationObserver() {
  if (Platform.OS === 'web') return null;
  return <Observer />;
}

function Observer() {
  const { isAuthenticated } = useSession();
  const { totalUnread } = useWorkspace();
  const markAsRead = useMutation(api.emails.markAsRead);
  const handledInitial = useRef(false);
  usePushRegistration();

  useEffect(() => {
    void configureNotifications();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handle = (response: Notifications.NotificationResponse) => {
      const data = (response.notification.request.content.data ?? {}) as PushData;
      const action = response.actionIdentifier;

      if (action === ACTIONS.markRead && data.emailId) {
        markAsRead({ emailId: data.emailId as Id<'emails'> }).catch(() => {});
        void Notifications.dismissNotificationAsync(response.notification.request.identifier);
        return;
      }
      if (action === ACTIONS.reply && data.emailId) {
        router.push({ pathname: '/compose', params: { mode: 'reply', emailId: data.emailId, ...(data.mailboxId ? { mailboxId: data.mailboxId } : {}) } });
        return;
      }
      const path = safeAppPath(data.url) ?? (data.emailId ? `/email/${data.emailId}` : data.batchId ? `/campaign/${encodeURIComponent(data.batchId)}` : null);
      if (path) router.push(path as never);
    };

    // The tap that launched the app from a killed state.
    if (!handledInitial.current) {
      handledInitial.current = true;
      const initial = Notifications.getLastNotificationResponse();
      if (initial) {
        handle(initial);
        void Notifications.clearLastNotificationResponseAsync();
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [isAuthenticated, markAsRead]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Notifications.setBadgeCountAsync(totalUnread).catch(() => {});
  }, [isAuthenticated, totalUnread]);

  return null;
}
