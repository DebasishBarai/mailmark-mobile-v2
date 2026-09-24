import { useAction } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/convex/api';
import type { Email, EmailBody } from '@/lib/convex/types';
import { stripTrackingPixel } from '@/lib/email/compose';

/**
 * Bodies live in S3 and are fetched through ses.fetchEmailBody, which parses
 * the raw MIME server side. They never change once stored, so a fetched body
 * is kept in memory for the session and reopening a message is instant.
 */
const cache = new Map<string, EmailBody>();

export type BodyState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; body: EmailBody };

type Fetched = { key: string; state: BodyState };

export function useEmailBody(email: Email | null | undefined): BodyState & { reload: () => void } {
  const fetchBody = useAction(api.ses.fetchEmailBody);
  const [attempt, setAttempt] = useState(0);
  const [fetched, setFetched] = useState<Fetched | null>(null);

  const s3Key = email?.s3Key;
  const id = email?._id;
  const folder = email?.folder;
  const key = id ? `${id}:${attempt}` : '';
  const cached = id ? cache.get(id) : undefined;

  useEffect(() => {
    if (!s3Key || !id || cache.has(id)) return;
    let cancelled = false;
    fetchBody({ s3Key })
      .then((result) => {
        // As on the website: keep the pixel in received mail, strip it from
        // your own sent mail so reading it back does not register an open.
        const body = folder === 'inbox' ? result.body : stripTrackingPixel(result.body);
        const value = { body, attachments: result.attachments };
        cache.set(id, value);
        if (!cancelled) setFetched({ key, state: { status: 'success', body: value } });
      })
      .catch((error) => {
        if (!cancelled) setFetched({ key, state: { status: 'error', error } });
      });
    return () => {
      cancelled = true;
    };
  }, [s3Key, id, folder, fetchBody, key]);

  const reload = useCallback(() => {
    if (id) cache.delete(id);
    setAttempt((a) => a + 1);
  }, [id]);

  const state: BodyState = cached
    ? { status: 'success', body: cached }
    : fetched && fetched.key === key
      ? fetched.state
      : { status: 'loading' };

  return { ...state, reload };
}

export function cachedBody(emailId: string): EmailBody | undefined {
  return cache.get(emailId);
}
