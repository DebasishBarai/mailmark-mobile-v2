import { local } from '@/lib/storage';

/**
 * Mark as read taps not yet confirmed by the server, oldest first. The button
 * works without a connection: the tap is saved here and the notification goes
 * away at once, and the call is sent when a connection allows (on the tap
 * itself, on launch, on return to the app, when the network comes back, and
 * on each background check). Cleared on sign-out.
 */
const PENDING_KEY = 'pendingMarkRead';

/**
 * Changes to the list run one at a time, so a tap saved while a send is
 * removing another entry is never lost.
 */
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => {});
  return run;
}

export function pendingReads(): Promise<string[]> {
  return local.get<string[]>(PENDING_KEY, []);
}

export function queueMarkRead(emailId: string): Promise<void> {
  return serial(async () => {
    const list = await pendingReads();
    if (!list.includes(emailId)) await local.set(PENDING_KEY, [...list, emailId]);
  });
}

function removeFromQueue(emailId: string): Promise<void> {
  return serial(async () => {
    await local.set(PENDING_KEY, (await pendingReads()).filter((id) => id !== emailId));
  });
}

export function clearPendingReads(): Promise<void> {
  return serial(() => local.remove(PENDING_KEY));
}

let flushing: Promise<void> | null = null;

/**
 * Send the queued taps with `markRead`, one send at a time. fetch failing
 * (a TypeError) means no connection: the rest wait for the next try. Any
 * other error is the server refusing, say because the email was deleted,
 * which a retry would not change, so that tap is dropped.
 */
export function flushPendingReads(markRead: (emailId: string) => Promise<unknown>): Promise<void> {
  if (!flushing) {
    flushing = (async () => {
      for (const emailId of await pendingReads()) {
        try {
          await markRead(emailId);
        } catch (err) {
          if (err instanceof TypeError) return;
        }
        await removeFromQueue(emailId);
      }
    })().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}
