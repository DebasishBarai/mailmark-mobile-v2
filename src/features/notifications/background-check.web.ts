import type { LocalNotification } from './mail-check';

/** Background checks and local notifications are native only. */
export const MAIL_CHECK_TASK = 'mailmark-mail-check';
export async function showNotifications(_list: LocalNotification[]) {}
export async function registerMailCheck() {}
export async function unregisterMailCheck() {}
export async function backgroundStatus(): Promise<'available' | 'restricted' | 'unavailable'> {
  return 'unavailable';
}
