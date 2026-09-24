import type { AttachmentData } from '@/lib/convex/types';

/** Web build: trigger a browser download of the decoded bytes. */
export async function shareAttachment(att: AttachmentData): Promise<void> {
  const bytes = Uint8Array.from(atob(att.data), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: att.contentType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = att.filename;
  a.click();
  URL.revokeObjectURL(url);
}
