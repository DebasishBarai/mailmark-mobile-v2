import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

/** Opens a link from a message: web links in the in-app browser, mailto: in compose. */
export function openMessageLink(url: string, mailboxId?: string) {
  if (url.startsWith('mailto:')) {
    const address = decodeURIComponent(url.slice('mailto:'.length).split('?')[0]);
    router.push({ pathname: '/compose', params: { to: address, ...(mailboxId ? { mailboxId } : {}) } });
    return;
  }
  if (/^https?:/i.test(url)) {
    void WebBrowser.openBrowserAsync(url);
    return;
  }
  void Linking.openURL(url).catch(() => {});
}
