import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function fileName(subject: string): string {
  const slug = subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'campaign'}.csv`;
}

/**
 * Hands a campaign's CSV to the system share sheet (Mail, Files, Drive,
 * Numbers or Sheets), the way attachments are shared. The web build has no
 * file system, so it downloads the file instead.
 */
export async function shareCampaignCsv(csv: string, subject: string): Promise<void> {
  const name = fileName(subject);
  if (process.env.EXPO_OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, `${Date.now()}-${name}`);
  file.create({ overwrite: true });
  file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: name });
  }
}
