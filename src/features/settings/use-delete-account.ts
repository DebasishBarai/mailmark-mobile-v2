import { useAction } from 'convex/react';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { useSession } from '@/features/auth/session';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import { useLiveQuery } from '@/lib/convex/hooks';
import { manageSubscriptions } from '@/lib/purchases';

/**
 * Delete the account from inside the app, as App Store Review (5.1.1(v)) and
 * Google Play require of any app people can sign up in. Used from Settings →
 * Account and from the plan paywall, so someone who never subscribes can
 * still reach it.
 *
 * The backend (accountDeletion.deleteMyAccount) cancels a web plan, deletes
 * the Clerk user and purges the data. A store subscription cannot be
 * cancelled from there, so the confirmation says so first and offers the
 * store's subscription settings.
 */
export function useDeleteAccount() {
  const { signOut } = useSession();
  const toast = useToast();
  const deleteMyAccount = useAction(api.accountDeletion.deleteMyAccount);
  const status = useLiveQuery(api.subscriptions.currentStatus, {});
  const [deleting, setDeleting] = useState(false);

  const sub = status.data?.subscription;
  const storeLive = sub?.store !== undefined && (sub.status === 'active' || sub.status === 'trialing') && !sub.cancelAtPeriodEnd;

  const run = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteMyAccount({});
    } catch (err) {
      setDeleting(false);
      toast.show({ message: errorMessage(err, 'Could not delete your account.'), tone: 'error' });
      return;
    }
    // The Clerk user is already gone, so this only clears the local session.
    try {
      await signOut();
    } catch {
      // Nothing left to sign out of.
    }
  }, [deleteMyAccount, signOut, toast]);

  const confirmDelete = useCallback(() => {
    const finalConfirm = () =>
      Alert.alert(
        'Delete your account?',
        'Your mailboxes and all their mail, your domains, campaigns, contacts and settings are deleted permanently, on every device and on the website. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete account', style: 'destructive', onPress: () => void run() },
        ],
      );

    if (storeLive) {
      const where = sub?.store === 'play_store' ? 'Google Play' : 'the App Store';
      Alert.alert(
        'Cancel your subscription first',
        `Your plan is billed through ${where}. Deleting your account does not stop that subscription: cancel it in your ${where} subscription settings so you are not charged again.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Manage subscription', onPress: () => void manageSubscriptions() },
          { text: 'Delete anyway', style: 'destructive', onPress: finalConfirm },
        ],
      );
      return;
    }
    finalConfirm();
  }, [run, storeLive, sub?.store]);

  return { confirmDelete, deleting };
}
