import * as Clipboard from 'expo-clipboard';
import { useMutation } from 'convex/react';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useActionSheet, type SheetOption } from '@/components/feedback/action-sheet';
import { useToast } from '@/components/feedback/toast';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import type { Email } from '@/lib/convex/types';
import { rawEmail } from '@/lib/email/address';
import { haptic } from '@/lib/haptics';

import { queueMailChange } from './pending-changes';

/**
 * Everything a person can do to a message from a list row, a swipe or the
 * reader, over the same mutations the website calls. Read, star and move go
 * through the pending-change queue (pending-changes.ts): they show at once
 * and reach the server when a connection allows, offline included.
 */
export function useEmailActions() {
  const toast = useToast();
  const sheet = useActionSheet();
  const cancelScheduled = useMutation(api.emails.cancelScheduledEmail);

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      haptic('error');
      toast.show({ message: errorMessage(err, fallback), tone: 'error', icon: 'warning' });
    },
    [toast],
  );

  const trash = useCallback(
    async (email: Email) => {
      const from = email.folder;
      await queueMailChange(email, { folder: 'trash' });
      toast.show({
        message: 'Moved to Trash',
        icon: 'trash',
        action: {
          label: 'Undo',
          onPress: () => void queueMailChange({ ...email, folder: 'trash' }, { folder: from }),
        },
      });
    },
    [toast],
  );

  const restore = useCallback(
    async (email: Email) => {
      await queueMailChange(email, { folder: 'inbox' });
      toast.show({ message: 'Moved to Inbox', icon: 'inbox' });
    },
    [toast],
  );

  const setRead = useCallback((email: Email, read: boolean) => queueMailChange(email, { read }), []);

  const toggleStar = useCallback((email: Email) => queueMailChange(email, { starred: !email.starred }), []);

  const cancelSchedule = useCallback(
    (email: Email, onDone?: () => void) => {
      Alert.alert('Cancel scheduled send?', 'The message will be removed from the Outbox and will not be sent.', [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel send',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelScheduled({ emailId: email._id });
              toast.show({ message: 'Scheduled send cancelled', icon: 'check' });
              onDone?.();
            } catch (err) {
              fail(err, 'Could not cancel this send.');
            }
          },
        },
      ]);
    },
    [cancelScheduled, toast, fail],
  );

  const reply = useCallback((email: Email, mode: 'reply' | 'replyAll' | 'forward' = 'reply') => {
    router.push({ pathname: '/compose', params: { mode, emailId: email._id, mailboxId: email.mailboxId, folder: email.folder } });
  }, []);

  const showMenu = useCallback(
    (email: Email) => {
      const options: SheetOption[] = [];
      if (email.folder === 'outbox') {
        options.push({ label: 'Cancel scheduled send', icon: 'stop', destructive: true, onPress: () => cancelSchedule(email) });
      } else {
        options.push({ label: 'Reply', icon: 'reply', onPress: () => reply(email, 'reply') });
        options.push({ label: 'Reply all', icon: 'replyAll', onPress: () => reply(email, 'replyAll') });
        options.push({ label: 'Forward', icon: 'forward', onPress: () => reply(email, 'forward') });
      }
      if (email.folder === 'inbox') {
        options.push({
          label: email.read ? 'Mark as unread' : 'Mark as read',
          icon: email.read ? 'markUnread' : 'markRead',
          onPress: () => setRead(email, !email.read),
        });
      }
      options.push({
        label: email.starred ? 'Remove star' : 'Star',
        icon: email.starred ? 'starOutline' : 'star',
        onPress: () => toggleStar(email),
      });
      options.push({
        label: 'Copy sender address',
        icon: 'copy',
        onPress: async () => {
          await Clipboard.setStringAsync(rawEmail(email.from));
          toast.show({ message: 'Address copied', icon: 'copy' });
        },
      });
      if (email.folder === 'trash') {
        options.push({ label: 'Move to Inbox', icon: 'inbox', onPress: () => restore(email) });
      } else if (email.folder !== 'outbox') {
        options.push({ label: 'Move to Trash', icon: 'trash', destructive: true, onPress: () => trash(email) });
      }
      sheet.show({ title: email.subject || '(no subject)', options });
    },
    [sheet, cancelSchedule, reply, setRead, toggleStar, toast, restore, trash],
  );

  return { trash, restore, setRead, toggleStar, cancelSchedule, reply, showMenu };
}
