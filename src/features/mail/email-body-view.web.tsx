import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { emailDocument } from './email-html';

export type EmailBodyViewProps = {
  html: string;
  blockRemoteImages?: boolean;
  mailboxId?: string;
};

export { openMessageLink } from './open-message-link';

/** Web build: a sandboxed iframe (no scripts), sized to its document. */
export function EmailBodyView({ html, blockRemoteImages }: EmailBodyViewProps) {
  const theme = useTheme();
  const [height, setHeight] = useState(160);
  const ref = useRef<HTMLIFrameElement>(null);
  const doc = useMemo(
    () => emailDocument(html, { blockRemoteImages }).replace('<head>', '<head><base target="_blank">'),
    [html, blockRemoteImages],
  );

  return (
    <View style={[styles.frame, { borderColor: theme.border, height }]}>
      <iframe
        ref={ref}
        title="Message body"
        srcDoc={doc}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{ border: 0, width: '100%', height: '100%', background: '#ffffff' }}
        onLoad={() => {
          const body = ref.current?.contentDocument?.documentElement;
          if (body) setHeight(Math.min(body.scrollHeight + 2, 20000));
        }}
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
