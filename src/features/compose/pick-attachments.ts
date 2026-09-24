import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import type { OutgoingAttachment } from '@/lib/convex/types';

export type PickedAttachment = OutgoingAttachment & { id: string; size: number };

/**
 * Attachments travel to ses.sendEmail as base64 inside the action's
 * arguments, exactly as the website sends them, and Convex caps the size of
 * a function call's arguments. This keeps the total comfortably under it.
 */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

let seq = 0;
const nextId = () => `att-${Date.now()}-${++seq}`;

async function readBase64(uri: string): Promise<string> {
  if (process.env.EXPO_OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  return await new File(uri).base64();
}

async function toAttachment(uri: string, name: string, mimeType: string | null | undefined, size: number | undefined): Promise<PickedAttachment> {
  const data = await readBase64(uri);
  return {
    id: nextId(),
    filename: name,
    contentType: mimeType || 'application/octet-stream',
    data,
    size: size ?? Math.floor((data.length * 3) / 4),
  };
}

export async function pickFiles(): Promise<PickedAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (result.canceled) return [];
  return Promise.all(result.assets.map((a) => toAttachment(a.uri, a.name, a.mimeType, a.size)));
}

export async function pickPhotos(): Promise<PickedAttachment[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return Promise.all(
    result.assets.map((a, i) =>
      toAttachment(a.uri, a.fileName ?? `photo-${i + 1}.${a.mimeType?.split('/')[1] ?? 'jpg'}`, a.mimeType, a.fileSize),
    ),
  );
}

/** Returns null when camera permission is refused. */
export async function takePhoto(): Promise<PickedAttachment[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  if (result.canceled) return [];
  const a = result.assets[0];
  return [await toAttachment(a.uri, a.fileName ?? `photo-${Date.now()}.jpg`, a.mimeType ?? 'image/jpeg', a.fileSize)];
}

/** A CSV or spreadsheet export for recipient import, as text. */
export async function pickCsvText(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (process.env.EXPO_OS === 'web') {
    return { name: asset.name, text: await (await fetch(asset.uri)).text() };
  }
  return { name: asset.name, text: await new File(asset.uri).text() };
}
