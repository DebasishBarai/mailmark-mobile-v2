import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sanitizeHtml } from '@/lib/email/format';

import { richEditorDocument, type RichEditorCommand, type RichEditorMessage } from './rich-editor-document';
import { editorHeightBounds, type RichTextEditorProps } from './rich-text-editor-types';

export type { RichTextEditorHandle, RichTextEditorProps } from './rich-text-editor-types';

/**
 * Rich text editing on iOS and Android: a contentEditable page in a web
 * view. It grows with its content up to a cap, then scrolls inside, so the
 * caret never ends up behind the keyboard.
 */
export function RichTextEditor({ value, onChange, placeholder, onFocus, onActiveChange, onRequestLink, ref }: RichTextEditorProps) {
  const theme = useTheme();
  const web = useRef<WebView>(null);
  const { height: windowHeight } = useWindowDimensions();
  const { min, max } = editorHeightBounds(windowHeight);
  const [contentHeight, setContentHeight] = useState(min);
  // The HTML the page last reported, so the parent echoing it back does not
  // reset the page (and the caret) while typing.
  const lastEmitted = useRef<string | null>(value);
  const [source] = useState(() => ({ html: richEditorDocument(sanitizeHtml(value), placeholder) }));

  const send = (cmd: RichEditorCommand) => {
    web.current?.injectJavaScript(`window.__mmHandle && window.__mmHandle(${JSON.stringify(cmd)}); true;`);
  };

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    web.current?.injectJavaScript(
      `window.__mmHandle && window.__mmHandle(${JSON.stringify({ t: 'set', html: sanitizeHtml(value) } satisfies RichEditorCommand)}); true;`,
    );
  }, [value]);

  useImperativeHandle(ref, () => ({
    exec: (action, arg) => send({ t: 'exec', action, value: arg }),
    insertText: (text) => send({ t: 'insert', text }),
    focus: () => {
      web.current?.requestFocus();
      send({ t: 'focus' });
    },
  }));

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: RichEditorMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.t === 'change') {
      lastEmitted.current = msg.html;
      onChange(msg.html);
    } else if (msg.t === 'height') {
      if (Number.isFinite(msg.h) && msg.h > 0) setContentHeight(msg.h);
    } else if (msg.t === 'state') {
      onActiveChange?.(msg.state);
    } else if (msg.t === 'focus') {
      onFocus?.();
    } else if (msg.t === 'request' && msg.action === 'link') {
      onRequestLink?.();
    }
  };

  // The document loads as about:blank / data:; anything else is a tapped link,
  // which must never replace the editor.
  const onNavigate = (request: WebViewNavigation) => request.url.startsWith('about:') || request.url.startsWith('data:');

  const height = Math.min(Math.max(contentHeight, min), max);

  return (
    <View style={[styles.frame, { borderColor: theme.border, height }]}>
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={source}
        style={styles.web}
        javaScriptEnabled
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onNavigate}
        onLoadEnd={() => send({ t: 'sync' })}
        setSupportMultipleWindows={false}
        scrollEnabled={contentHeight > max}
        nestedScrollEnabled
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={contentHeight > max}
        accessibilityLabel="Message body"
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
  web: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
