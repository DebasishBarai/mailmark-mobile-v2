/**
 * Runtime configuration, read from EXPO_PUBLIC_* variables at build time.
 *
 * The mobile app is another client of the same backend the website uses, so
 * these point at the same Convex deployment and the same Clerk instance as the
 * web app's NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
 */

function trimSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export const Config = {
  /** Convex deployment URL, e.g. https://happy-animal-123.convex.cloud */
  convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL ?? '',
  /** Clerk publishable key for the same Clerk instance the website uses. */
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  /** The website, used for billing hand-off, docs and the Google Sheets CSV proxy. */
  webUrl: trimSlash(process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.mailmark.dev'),
  /** Public REST API base, as documented in the OpenAPI spec. */
  apiUrl: trimSlash(process.env.EXPO_PUBLIC_API_URL ?? 'https://api.mailmark.dev'),
} as const;

export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!Config.convexUrl) missing.push('EXPO_PUBLIC_CONVEX_URL');
  if (!Config.clerkPublishableKey) missing.push('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
  return missing;
}

export const WebLinks = {
  docs: `${Config.webUrl}/docs`,
  apiDocs: `${Config.webUrl}/docs/api`,
  openApi: `${Config.webUrl}/openapi.json`,
  domainSetup: `${Config.webUrl}/docs/domain-setup`,
  campaignsDocs: `${Config.webUrl}/docs/email-campaigns`,
  sequencesDocs: `${Config.webUrl}/docs/sequences`,
  warmupDocs: `${Config.webUrl}/docs/warmup`,
  byoAws: `${Config.webUrl}/docs/byo-aws`,
  troubleshooting: `${Config.webUrl}/docs/troubleshooting`,
  settings: `${Config.webUrl}/settings`,
  billing: `${Config.webUrl}/billing`,
  privacy: `${Config.webUrl}/privacy`,
  terms: `${Config.webUrl}/terms`,
  status: `${Config.webUrl}/status`,
  csvProxy: `${Config.webUrl}/api/fetch-csv`,
} as const;
