/**
 * When an unverified domain will be removed by the nightly cleanup. Ported
 * from the website's lib/domainRemoval.ts and checked against its tests.
 *
 * The backend's convex/crons.ts runs cleanupUnverifiedDomainsInternal every
 * day at 00:00 UTC with olderThanDays: 7, and it deletes every domain still
 * unverified whose _creationTime is more than 7 days before that run. So a
 * domain goes at the first UTC midnight that is at least 7 days after it was
 * added. Keep these two constants in step with that cron.
 *
 * Midnight UTC is the previous evening across the US (8 PM Eastern, 5 PM
 * Pacific in summer), so the time is always shown in the device's own time
 * zone rather than as a bare date.
 */
export const UNVERIFIED_REMOVAL_DAYS = 7;
const CLEANUP_HOUR_UTC = 0;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** How close removal has to be before the warning turns red. */
export const REMOVAL_SOON_MS = 2 * DAY_MS;

/** The time the cleanup removes a domain added at `createdAt` if it is still unverified. */
export function unverifiedRemovalTime(createdAt: number): number {
  const due = createdAt + UNVERIFIED_REMOVAL_DAYS * DAY_MS;
  // The first cleanup run at or after `due`.
  const offset = CLEANUP_HOUR_UTC * HOUR_MS;
  return Math.ceil((due - offset) / DAY_MS) * DAY_MS + offset;
}

export type RemovalUrgency = 'later' | 'soon' | 'overdue';

/**
 * "overdue" means the run should already have removed it. The cleanup works
 * in batches, so a domain can outlive its time by a day.
 */
export function removalUrgency(removeAt: number, now: number): RemovalUrgency {
  if (now >= removeAt) return 'overdue';
  return removeAt - now <= REMOVAL_SOON_MS ? 'soon' : 'later';
}

/**
 * "Saturday, October 10 at 8:00 PM" in the device's time zone. Follows the
 * device locale like the rest of the app's dates (src/lib/format.ts).
 */
export function formatRemovalTime(removeAt: number, locale?: string, timeZone?: string): string {
  const date = new Date(removeAt);
  const day = date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', timeZone });
  const time = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone });
  return `${day} at ${time}`;
}

/** "Oct 10" in the device's time zone, for a one-line hint. */
export function formatRemovalDate(removeAt: number, locale?: string, timeZone?: string): string {
  return new Date(removeAt).toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone });
}
