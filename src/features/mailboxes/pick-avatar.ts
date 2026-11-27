import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** What recipients see is up to their mail app, so the screens say so once. */
export const AVATAR_NOTE =
  'Shown for this address across Mailmark. Gmail, Outlook and Apple Mail choose sender photos from their own sources, so recipients may not see it.';

/** Width and height of a stored profile image, in pixels (the website uses the same). */
const AVATAR_SIZE = 256;

/**
 * Lets the user pick a photo, crops it to its centre square and scales it to
 * AVATAR_SIZE, and returns it as the data URL mailboxes.setAvatar takes.
 * Resolves to null when the user cancels.
 *
 * The server refuses images over 1 MB, which a full-size phone photo is, so the
 * scaling happens here. PNG and WebP sources stay PNG to keep transparency
 * (logos); everything else becomes JPEG.
 */
export async function pickAvatarImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  const side = Math.min(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width !== asset.height && side > 0) {
    // Android's editor and iOS without editing can hand back a non-square image.
    context.crop({ originX: (asset.width - side) / 2, originY: (asset.height - side) / 2, width: side, height: side });
  }
  context.resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
  const image = await context.renderAsync();

  const keepAlpha = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp';
  const saved = await image.saveAsync({
    base64: true,
    format: keepAlpha ? SaveFormat.PNG : SaveFormat.JPEG,
    compress: 0.85,
  });
  if (!saved.base64) throw new Error('The image could not be read.');
  return `data:image/${keepAlpha ? 'png' : 'jpeg'};base64,${saved.base64}`;
}
