import { useRef } from 'react';
import { Alert, Platform } from 'react-native';

import { useActionSheet } from '@/components/feedback/action-sheet';
import type { IconName } from '@/components/ui';
import { FORMAT_LABELS, restoredBody, switchFormat, type ComposeFormat, type FormatSwitch } from '@/lib/email/format';

const ORDER: ComposeFormat[] = ['rich', 'plain', 'markdown', 'html'];
const ICONS: Record<ComposeFormat, IconName> = { rich: 'font', plain: 'file', markdown: 'merge', html: 'code' };

function confirm(title: string, message: string, onConfirm: () => void) {
  // Alert has no web implementation, so the browser's own dialog stands in.
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Switch', style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * The "Message format" menu. Switching rewrites the body so it renders the
 * same in the new format (bold becomes ** in Markdown and <b> in HTML), and
 * switching straight back without editing restores the exact original text.
 */
export function useFormatChooser({
  format,
  body,
  onSwitch,
}: {
  format: ComposeFormat;
  body: string;
  onSwitch: (format: ComposeFormat, body: string) => void;
}) {
  const sheet = useActionSheet();
  const last = useRef<FormatSwitch | null>(null);

  const switchTo = (to: ComposeFormat) => {
    if (to === format) return;
    const go = () => {
      const result = switchFormat(last.current, format, to, body);
      last.current = result.last;
      onSwitch(to, result.body);
    };
    const restoring = restoredBody(last.current, format, to, body) !== null;
    if (!restoring && to === 'plain' && body.trim()) {
      confirm('Switch to plain text?', 'Plain text cannot hold formatting, so bold, fonts, colors and links are removed.', go);
      return;
    }
    go();
  };

  return (message?: string) =>
    sheet.show({
      title: 'Message format',
      message,
      options: ORDER.map((f) => ({ label: FORMAT_LABELS[f], icon: ICONS[f], onPress: () => switchTo(f) })),
    });
}
