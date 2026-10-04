import type { CampaignDraft } from './draft';

/**
 * Hands a message over from the composer to the New campaign flow.
 *
 * In memory rather than in route params: a customer list can run to hundreds
 * of addresses, which do not belong in a URL (on web the params are the URL).
 * The flow is opened with a one-time id and reads the handoff by that id
 * without consuming it, so a second render of the draft provider (React's
 * development double-invoke, a remount) still finds it. The single slot is
 * simply replaced by the next handoff.
 */
type Handoff = { id: string; draft: Partial<CampaignDraft> };

let slot: Handoff | null = null;

export function setCampaignHandoff(draft: Partial<CampaignDraft>): string {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  slot = { id, draft };
  return id;
}

export function getCampaignHandoff(id: string | undefined): Partial<CampaignDraft> | null {
  return id && slot?.id === id ? slot.draft : null;
}
