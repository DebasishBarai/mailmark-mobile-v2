import { useMemo } from 'react';

import { api } from '@/lib/convex/api';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Email } from '@/lib/convex/types';
import type { NameMaps } from '@/lib/email/address';

/**
 * Display names for the addresses on screen: the user's own mailbox names,
 * plus address-book names looked up only for the bare addresses visible
 * (the same targeted lookup the website's mailbox page makes).
 */
export function useNameMaps(emails: Email[]): NameMaps {
  const key = useMemo(() => {
    const seen = new Set<string>();
    for (const email of emails) {
      for (const addr of [email.from, ...email.to, ...(email.cc ?? [])]) {
        if (addr && !addr.includes('<')) seen.add(addr.toLowerCase().trim());
      }
    }
    return [...seen].sort().slice(0, 300).join(',');
  }, [emails]);

  const contacts = useLiveQuery(api.contacts.namesByEmails, key ? { emails: key.split(',') } : 'skip');
  const own = useLiveQuery(api.mailboxes.displayNamesForCurrentUser, {});

  return useMemo(
    () => ({
      own: new Map((own.data ?? []).map((m) => [m.email.toLowerCase(), m.name])),
      contacts: new Map((contacts.data ?? []).map((c) => [c.email.toLowerCase(), c.name])),
    }),
    [own.data, contacts.data],
  );
}
