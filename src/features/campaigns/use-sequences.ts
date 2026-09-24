import { useQueries } from 'convex/react';
import { useMemo } from 'react';

import { useWorkspace } from '@/features/workspace/workspace';
import { api } from '@/lib/convex/api';
import type { LiveQuery } from '@/lib/convex/hooks';
import type { Sequence } from '@/lib/convex/types';

/**
 * Every follow-up sequence on the account, read the way the website's
 * Follow-ups folder reads them: sequenceActions.getByMailbox for each mailbox.
 */
export function useSequences(): LiveQuery<Sequence[]> {
  const { mailboxes } = useWorkspace();
  const requests = useMemo(
    () =>
      Object.fromEntries(
        (mailboxes.data ?? []).map((m) => [m._id, { query: api.sequences.getByMailbox, args: { mailboxId: m._id } }]),
      ),
    [mailboxes.data],
  );
  const results = useQueries(requests);

  let status: 'loading' | 'success' | 'error' = mailboxes.status;
  let error: Error | undefined = mailboxes.error;
  const merged: Sequence[] = [];
  if (mailboxes.status === 'success') {
    for (const m of mailboxes.data) {
      const value = results[m._id];
      if (value instanceof Error) {
        status = 'error';
        error = value;
        break;
      }
      if (value === undefined) {
        status = 'loading';
        break;
      }
      merged.push(...(value as Sequence[]));
    }
  }
  const signature = status === 'success' ? JSON.stringify(merged.sort((a, b) => b.createdAt - a.createdAt)) : '';
  const data = useMemo(() => (signature ? (JSON.parse(signature) as Sequence[]) : undefined), [signature]);

  return useMemo<LiveQuery<Sequence[]>>(() => {
    if (status === 'error') return { status, data: undefined, error: error! };
    if (status === 'success' && data) return { status, data, error: undefined };
    return { status: 'loading', data: undefined, error: undefined };
  }, [status, data, error]);
}
