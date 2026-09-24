import { router, type Href } from 'expo-router';

/**
 * Close a modal that has its own stack (New campaign): pop to the modal's
 * first screen, then go back once more to dismiss the modal itself.
 * Optionally open a route underneath once it has closed.
 */
export function exitModalStack(then?: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.back();
  if (then) setTimeout(() => router.push(then), 0);
}
