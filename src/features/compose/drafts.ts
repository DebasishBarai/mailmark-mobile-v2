import { useSyncExternalStore } from 'react';

import type { ContentType } from '@/lib/email/compose';
import { local } from '@/lib/storage';

/**
 * Drafts kept on this device.
 *
 * The backend has a drafts folder but no function that saves one: the
 * website composes in memory and nothing it writes lands in "drafts". So a
 * message you are writing on the phone is autosaved here instead, survives
 * the app being closed, and appears at the top of Drafts. Attachments are
 * not stored with a draft, to keep file bytes out of unencrypted storage.
 */
export type LocalDraft = {
  id: string;
  mailboxId: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  contentType: ContentType;
  mode?: 'compose' | 'reply' | 'replyAll' | 'forward';
  replyToEmailId?: string;
  quote?: string;
  updatedAt: number;
};

const KEY = 'drafts';
let drafts: LocalDraft[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function load() {
  if (loaded) return;
  loaded = true;
  drafts = await local.get<LocalDraft[]>(KEY, []);
  emit();
}

function persist() {
  void local.set(KEY, drafts);
  emit();
}

export const draftStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    void load();
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    return drafts;
  },
  get(id: string) {
    return drafts.find((d) => d.id === id);
  },
  save(draft: LocalDraft) {
    const rest = drafts.filter((d) => d.id !== draft.id);
    drafts = [draft, ...rest].slice(0, 50);
    persist();
  },
  remove(id: string) {
    drafts = drafts.filter((d) => d.id !== id);
    persist();
  },
  isEmpty(d: Pick<LocalDraft, 'to' | 'cc' | 'bcc' | 'subject' | 'body'>) {
    return !d.subject.trim() && !d.body.trim() && d.to.length + d.cc.length + d.bcc.length === 0;
  },
  newId() {
    return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },
};

const EMPTY: LocalDraft[] = [];

export function useLocalDrafts(mailboxId?: string): LocalDraft[] {
  const all = useSyncExternalStore(draftStore.subscribe, draftStore.getSnapshot, () => EMPTY);
  return mailboxId ? all.filter((d) => d.mailboxId === mailboxId) : all;
}
