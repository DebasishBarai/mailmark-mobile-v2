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

/**
 * Everything a person can do to a message from a list row, a swipe or the
 * reader, over the same mutations the website calls. Mutations are
 * reactive: the list re-renders from the server once each one lands.
 */
export function useEmailActions() {
  const toast = useToast();
  const sheet = useActionSheet();
  const moveToFolder = useMutation(api.emails.moveToFolder);
  const markAsRead = useMutation(api.emails.markAsRead);
  const markAsUnread = useMutation(api.emails.markAsUnread);
  const toggleStarMutation = useMutation(api.emails.toggleStar);
  const deleteEmail = useMutation(api.emails.deleteEmail);
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
      try {
        await moveToFolder({ emailId: email._id, folder: 'trash' });
        toast.show({
          message: 'Moved to Trash',
          icon: 'trash',
          action: {
            label: 'Undo',
            onPress: () => {
              moveToFolder({ emailId: email._id, folder: from }).catch((err) => fail(err, 'Could not undo.'));
            },
          },
        });
      } catch (err) {
        fail(err, 'Could not move this message.');
      }
    },
    [moveToFolder, toast, fail],
  );

  const restore = useCallback(
    async (email: Email) => {
      try {
        await moveToFolder({ emailId: email._id, folder: 'inbox' });
        toast.show({ message: 'Moved to Inbox', icon: 'inbox' });
      } catch (err) {
        fail(err, 'Could not restore this message.');
      }
    },
    [moveToFolder, toast, fail],
  );

  const deleteForever = useCallback(
    (email: Email, onDone?: () => void) => {
      Alert.alert('Delete permanently?', 'This message will be removed from Mailmark. This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmail({ emailId: email._id });
              haptic('success');
              onDone?.();
            } catch (err) {
              fail(err, 'Could not delete this message.');
            }
          },
        },
      ]);
    },
    [deleteEmail, fail],
  );

  const setRead = useCallback(
    async (email: Email, read: boolean) => {
      try {
        await (read ? markAsRead : markAsUnread)({ emailId: email._id });
      } catch (err) {
        fail(err, 'Could not update this message.');
      }
    },
    [markAsRead, markAsUnread, fail],
  );

  const toggleStar = useCallback(
    async (email: Email) => {
      try {
        await toggleStarMutation({ emailId: email._id });
      } catch (err) {
        fail(err, 'Could not update this message.');
      }
    },
    [toggleStarMutation, fail],
  );

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
    router.push({ pathname: '/compose', params: { mode, emailId: email._id, mailboxId: email.mailboxId } });
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
        options.push({ label: 'Delete permanently', icon: 'trash', destructive: true, onPress: () => deleteForever(email) });
      } else if (email.folder !== 'outbox') {
        options.push({ label: 'Move to Trash', icon: 'trash', destructive: true, onPress: () => trash(email) });
      }
      sheet.show({ title: email.subject || '(no subject)', options });
    },
    [sheet, cancelSchedule, reply, setRead, toggleStar, toast, restore, deleteForever, trash],
  );

  return { trash, restore, deleteForever, setRead, toggleStar, cancelSchedule, reply, showMenu };
}
