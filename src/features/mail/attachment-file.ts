import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AttachmentData } from '@/lib/convex/types';

/**
 * Save a downloaded attachment to the cache directory and hand it to the
 * system share sheet, which is also where "Save to Files", "Open in…" and
 * Quick Look live. Cache files are cleared by the OS under storage pressure.
 */
export async function shareAttachment(att: AttachmentData): Promise<void> {
  const safeName = att.filename.replace(/[\\/:*?"<>|]+/g, '_') || 'attachment';
  const file = new File(Paths.cache, `${Date.now()}-${safeName}`);
  file.create({ overwrite: true });
  file.write(att.data, { encoding: 'base64' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: att.contentType, dialogTitle: att.filename });
  }
}
