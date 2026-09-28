import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sanitizeHtml } from '@/lib/email/format';

import { richEditorDocument, type RichEditorCommand, type RichEditorMessage } from './rich-editor-document';
import { editorHeightBounds, type RichTextEditorProps } from './rich-text-editor-types';

export type { RichTextEditorHandle, RichTextEditorProps } from './rich-text-editor-types';

/**
 * Web build: the same editor page as native, in an iframe. It is sandboxed
 * without allow-same-origin, so the page can run its editing script but
 * cannot reach the app; the two talk only through postMessage.
 */
export function RichTextEditor({ value, onChange, placeholder, onFocus, onActiveChange, onRequestLink, ref }: RichTextEditorProps) {
  const theme = useTheme();
  const frame = useRef<HTMLIFrameElement>(null);
  const { height: windowHeight } = useWindowDimensions();
  const { min, max } = editorHeightBounds(windowHeight);
  const [contentHeight, setContentHeight] = useState(min);
  const lastEmitted = useRef<string | null>(value);
  const [doc] = useState(() => richEditorDocument(sanitizeHtml(value), placeholder));

  // Keep the latest callbacks for the message listener without re-subscribing.
  const handlers = useRef({ onChange, onFocus, onActiveChange, onRequestLink });
  useEffect(() => {
    handlers.current = { onChange, onFocus, onActiveChange, onRequestLink };
  });

  const send = (cmd: RichEditorCommand) => {
    frame.current?.contentWindow?.postMessage({ __mmCmd: cmd }, '*');
  };

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const raw = (event.data as { __mmEditor?: string } | null)?.__mmEditor;
      if (typeof raw !== 'string') return;
      let msg: RichEditorMessage;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      const h = handlers.current;
      if (msg.t === 'change') {
        lastEmitted.current = msg.html;
        h.onChange(msg.html);
      } else if (msg.t === 'height') {
        if (Number.isFinite(msg.h) && msg.h > 0) setContentHeight(msg.h);
      } else if (msg.t === 'state') {
        h.onActiveChange?.(msg.state);
      } else if (msg.t === 'focus') {
        h.onFocus?.();
      } else if (msg.t === 'request' && msg.action === 'link') {
        h.onRequestLink?.();
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    send({ t: 'set', html: sanitizeHtml(value) });
  }, [value]);

  useImperativeHandle(ref, () => ({
    exec: (action, arg) => send({ t: 'exec', action, value: arg }),
    insertText: (text) => send({ t: 'insert', text }),
    focus: () => {
      frame.current?.focus();
      send({ t: 'focus' });
    },
  }));

  const height = Math.min(Math.max(contentHeight, min), max);

  return (
    <View style={[styles.frame, { borderColor: theme.border, height }]}>
      <iframe
        ref={frame}
        title="Message body"
        srcDoc={doc}
        sandbox="allow-scripts"
        onLoad={() => send({ t: 'sync' })}
        style={{ border: 0, width: '100%', height: '100%', background: '#ffffff' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
});
