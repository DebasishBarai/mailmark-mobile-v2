import type { IconName } from '@/components/ui';

export type MailFolder = 'inbox' | 'sent' | 'outbox' | 'drafts' | 'trash';

/**
 * The folders the backend keeps for every mailbox (see the /v1/emails folder
 * enum in the OpenAPI spec). There is no archive folder in Mailmark: moving
 * mail to a folder the website does not list would hide it there, so the
 * mobile app offers Trash (with undo) where a mail app would offer Archive.
 */
export const FOLDERS: { key: MailFolder; label: string; icon: IconName; description: string }[] = [
  { key: 'inbox', label: 'Inbox', icon: 'inbox', description: 'Mail received by this mailbox' },
  { key: 'sent', label: 'Sent', icon: 'send', description: 'Delivered, opened and bounced sends' },
  { key: 'outbox', label: 'Outbox', icon: 'outbox', description: 'Scheduled mail waiting to go out' },
  { key: 'drafts', label: 'Drafts', icon: 'drafts', description: 'Saved drafts' },
  { key: 'trash', label: 'Trash', icon: 'trash', description: 'Mail moved to trash' },
];

export function folderLabel(folder: string): string {
  return FOLDERS.find((f) => f.key === folder)?.label ?? folder;
}
