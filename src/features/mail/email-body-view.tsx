import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { MEASURE_SCRIPT, emailDocument } from './email-html';
import { openMessageLink } from './open-message-link';

export { openMessageLink };

export type EmailBodyViewProps = {
  html: string;
  blockRemoteImages?: boolean;
  mailboxId?: string;
};

/**
 * The rendered message, sized to its content so it scrolls with the rest of
 * the reader instead of inside a nested scroller.
 */
export function EmailBodyView({ html, blockRemoteImages, mailboxId }: EmailBodyViewProps) {
  const theme = useTheme();
  const [height, setHeight] = useState(120);
  const source = useMemo(() => ({ html: emailDocument(html, { blockRemoteImages }) }), [html, blockRemoteImages]);

  const onNavigate = (request: WebViewNavigation) => {
    // The document itself loads as about:blank / data:; anything else is a
    // link the reader tapped, which should leave the message, not replace it.
    if (request.url.startsWith('about:') || request.url.startsWith('data:')) return true;
    if (/^(https?|mailto|tel):/i.test(request.url)) {
      openMessageLink(request.url, mailboxId);
      return false;
    }
    return true;
  };

  return (
    <View style={[styles.frame, { borderColor: theme.border, height }]}>
      <WebView
        originWhitelist={['*']}
        source={source}
        style={styles.web}
        scrollEnabled={false}
        injectedJavaScript={MEASURE_SCRIPT}
        javaScriptEnabled
        onMessage={(event) => {
          const h = Number(event.nativeEvent.data);
          if (Number.isFinite(h) && h > 0) setHeight(Math.min(Math.ceil(h) + 2, 20000));
        }}
        onShouldStartLoadWithRequest={onNavigate}
        setSupportMultipleWindows={false}
        allowsLinkPreview
        dataDetectorTypes={['link', 'phoneNumber']}
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Message body"
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
  web: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
