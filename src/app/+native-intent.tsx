/**
 * Rewrites incoming links before Expo Router resolves them.
 *
 * App links (mailmark://email/{id}, /thread/{id}, /campaign/{batchId},
 * /sequence/{id}, /mailbox/{id}, /domain/{id}, /compose?to=…) already match
 * routes and pass through. Links to the website (https://www.mailmark.dev/…,
 * e.g. from a notification email or a shared link) are mapped to the screen
 * that shows the same thing in the app.
 *
 * Clerk's sign-in redirects (mailmark://sso-callback?…) are not screens: the
 * auth session that opened the browser reads them itself. On Android they
 * also arrive as a regular deep link, which would otherwise push an
 * "Unmatched Route" screen over the app once sign-in succeeds.
 */
const AUTH_CALLBACKS = new Set(['sso-callback', 'hosted-auth-callback', 'oauth-native-callback']);

const WEB_ROUTES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^\/mailbox\/([^/?#]+)/, (m) => `/mailbox/${m[1]}`],
  [/^\/domains\/([^/?#]+)/, (m) => `/domain/${m[1]}`],
  [/^\/domains\/?$/, () => '/domains'],
  [/^\/dashboard\/?$/, () => '/insights'],
  [/^\/warming\/?$/, () => '/warmup'],
  [/^\/domain-health\/?$/, () => '/deliverability'],
  [/^\/audience\/?$/, () => '/contacts'],
  [/^\/(developer|billing|unsubscribes|suppressions|affiliate)\/?$/, (m) => `/${m[1]}`],
  [/^\/settings\/?$/, () => '/more'],
];

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string | null {
  try {
    const url = new URL(path, 'mailmark://app');
    const isWeb = url.protocol === 'https:' || url.protocol === 'http:';
    // mailmark://email/123 parses with "email" as the host.
    const pathname =
      url.protocol === 'mailmark:' && url.host && url.host !== 'app'
        ? `/${url.host}${url.pathname === '/' ? '' : url.pathname}`
        : url.pathname;

    // Returning null leaves navigation alone; a cold start still needs a route.
    if (!isWeb && AUTH_CALLBACKS.has(pathname.split('/')[1])) return initial ? '/' : null;

    if (isWeb) {
      for (const [pattern, to] of WEB_ROUTES) {
        const match = pathname.match(pattern);
        if (match) return to(match);
      }
      return '/';
    }
    return `${pathname}${url.search}`;
  } catch {
    return '/';
  }
}
