import type { GroupContact, SenderGroup } from '@/lib/convex/types';

import { mergeRecipients, type MergeRecipient } from './draft';
import { nameOf, withFirstName } from './first-name';

/**
 * Saved lists (sender groups) keep each recipient's name next to the
 * address, so a list picked later still greets people with {{firstName}}.
 * Ported from customersToContacts and groupToCustomers in the website's
 * lib/campaign/audience.ts and checked against its tests.
 */

/** A saved list holds at most this many addresses (the backend refuses more). */
export const MAX_SAVED = 5_000;

/** The names worth saving with a list: one per recipient who has one. */
export function recipientsToContacts(recipients: MergeRecipient[]): GroupContact[] {
  return recipients.flatMap((r) => {
    const name = nameOf(r.fields);
    return name ? [{ email: r.email, name }] : [];
  });
}

/**
 * A saved list's recipients, with the names it was saved with. Lists saved
 * without names give addresses only.
 */
export function groupToRecipients(group: Pick<SenderGroup, 'emails' | 'contacts'>): MergeRecipient[] {
  const names = new Map((group.contacts ?? []).map((c) => [c.email.toLowerCase(), c.name]));
  return mergeRecipients(
    [],
    group.emails.map((email) => {
      const name = names.get(email.toLowerCase());
      return { email, fields: withFirstName(name ? { email, name } : { email }) };
    }),
  );
}

/**
 * The merge fields named recipients bring, for the Write step's merge
 * buttons: name and firstName when anyone has them, plus email when the
 * list has no columns yet (the buttons otherwise default to email alone).
 */
export function nameColumns(recipients: MergeRecipient[], existing: string[]): string[] {
  const named = ['name', 'firstName'].filter((k) => recipients.some((r) => r.fields[k]));
  if (named.length === 0) return [];
  return existing.length === 0 ? ['email', ...named] : named;
}
