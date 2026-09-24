import { api } from '@/lib/convex/api';
import { useLivePaginated } from '@/lib/convex/hooks';

/**
 * The most recent address-book entries, for recipient suggestions. The
 * address book is paginated server side (it can hold tens of thousands of
 * rows), so suggestions come from the newest few hundred.
 */
export function useContactSuggestions(enabled: boolean) {
  const contacts = useLivePaginated(api.contacts.listPageForCurrentUser, enabled ? {} : 'skip', 300);
  return contacts.items.map((c) => ({ email: c.email, name: c.name }));
}
