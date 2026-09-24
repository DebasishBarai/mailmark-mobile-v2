import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { LoadingState } from '@/components/ui';
import type { MailFolder } from '@/features/mail/folders';
import { useWorkspace } from '@/features/workspace/workspace';
import type { Id } from '@/lib/convex/types';

const FOLDER_KEYS: MailFolder[] = ['inbox', 'sent', 'outbox', 'drafts', 'trash'];

/** mailmark://mailbox/{id}[?folder=sent]: switch Mail to that mailbox. */
export default function MailboxRoute() {
  const { id, folder } = useLocalSearchParams<{ id: string; folder?: string }>();
  const { mailboxes, selectMailbox, setFolder } = useWorkspace();

  useEffect(() => {
    if (mailboxes.status === 'loading') return;
    if (mailboxes.data?.some((m) => m._id === id)) {
      selectMailbox(id as Id<'mailboxes'>);
      setFolder(FOLDER_KEYS.includes(folder as MailFolder) ? (folder as MailFolder) : 'inbox');
    }
    router.replace('/');
  }, [mailboxes.status, mailboxes.data, id, folder, selectMailbox, setFolder]);

  return <LoadingState />;
}
