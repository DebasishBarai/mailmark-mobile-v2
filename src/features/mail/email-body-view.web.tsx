import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { emailDocument } from './email-html';
import { followEmailDocument } from './follow-email-document';

export type EmailBodyViewProps = {
  html: string;
  blockRemoteImages?: boolean;
  mailboxId?: string;
};

export { openMessageLink } from './open-message-link';

/**
 * Web build: a sandboxed iframe (no scripts), sized to its document. The
 * iframe cannot run the native reader's measuring script, so this page does
 * the same work from outside: it scales a message laid out wider than the
 * frame down to fit, and follows the body's height as images and fonts load.
 */
export function EmailBodyView({ html, blockRemoteImages }: EmailBodyViewProps) {
  const theme = useTheme();
  const [height, setHeight] = useState(160);
  const ref = useRef<HTMLIFrameElement>(null);
  const doc = useMemo(
    () => emailDocument(html, { blockRemoteImages }).replace('<head>', '<head><base target="_blank">'),
    [html, blockRemoteImages],
  );

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let attached: Document | null = null;
    let cleanup: (() => void) | null = null;

    // Attach as soon as the message's document has a body, rather than on
    // the iframe's load event, which waits for every remote image.
    const tryAttach = () => {
      const d = frame.contentDocument;
      if (!d || d === attached || d.URL !== 'about:srcdoc' || !d.body) return;
      cleanup?.();
      attached = d;
      cleanup = followEmailDocument(frame, d, setHeight);
    };
    tryAttach();
    const poll = setInterval(tryAttach, 50);
    const stopPolling = setTimeout(() => clearInterval(poll), 10000);
    frame.addEventListener('load', tryAttach);
    return () => {
      clearInterval(poll);
      clearTimeout(stopPolling);
      frame.removeEventListener('load', tryAttach);
      cleanup?.();
    };
  }, [doc]);

  return (
    <View style={[styles.frame, { borderColor: theme.border, height }]}>
      <iframe
        ref={ref}
        title="Message body"
        srcDoc={doc}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{ border: 0, width: '100%', height: '100%', background: '#ffffff' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
});
