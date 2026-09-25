# Mailmark for iOS and Android

A native mobile client for [Mailmark](https://www.mailmark.dev): your
mailboxes, campaigns, domains and sending health, built for the phone. It runs
on the same backend as the website (Convex + Clerk + AWS) and calls the same
functions, so everything you do here is immediately reflected on the web and
the other way round.

Built with Expo SDK 57, Expo Router native tabs and React Native 0.86.

- **Mail**: every mailbox and folder, swipe actions, conversation view, rich
  compose with attachments, signatures, scheduling and on-device drafts.
- **Campaigns**: mail-merge campaigns from CSV or Google Sheets with
  follow-up sequences, and per-campaign delivery, open, click and reply stats.
- **Insights**: sending volume, delivery and engagement, plan usage and
  deliverability at a glance.
- **More**: domains and DNS, mailboxes, warmup, domain health, contacts,
  unsubscribes, suppressions, API keys and an API playground, billing,
  notifications, security and appearance.
- **Native**: new-mail and bounce notifications with actions, deep links, app lock with Face
  ID / fingerprint, share sheet, haptics, offline awareness.

See [docs/FEATURE_MAP.md](docs/FEATURE_MAP.md) for how each website feature
maps to the app and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it is
built.

## Setup

```bash
bun install
cp .env.example .env.local   # fill in the website's Convex URL and Clerk key
```

The app uses native modules that Expo Go does not include (Clerk, keyboard
controller, notifications), so run it in a development build:

```bash
bunx eas build --profile development --platform ios   # or android
bun start                                             # then open the dev build
```

or build locally with `bunx expo run:ios` / `bunx expo run:android`.

`.env.local` is gitignored, so EAS cloud builds never see it. Instead, every
build profile in `eas.json` sets `EXPO_PUBLIC_CONVEX_URL` and
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` to the website's production values under
`env`. Both are public (the website ships them in its JS bundle). They are
inlined into the JS bundle at build time, so changing them means rebuilding.

### CI builds

Every push to `main` runs two separate GitHub Actions workflows, each building
on GitHub's runners with `eas build --local` (no EAS cloud build quota used):

- `Build Android` — the `preview` APK (arm64 only), attached to the run.
- `Build iOS` — a simulator build (`preview-simulator` profile), which needs no
  Apple Developer account. For an installable `.ipa`, set up iOS credentials
  with `eas credentials` and change `PROFILE` in the workflow to `preview`.

Both need an `EXPO_TOKEN` repository secret (an access token from
expo.dev → Account settings → Access tokens).

### Backend

None. The app needs no backend or database changes: it calls only Convex
functions the website already calls, with the same arguments (the list is in
`src/lib/convex/api.ts`).

### Notifications

The backend sends a push through the Expo Push Service the moment new mail
arrives or a sent message bounces (`convex/push.ts` in the website repo). The
app registers the device's Expo push token with `pushTokens.register`. Turn
notifications on in More → Notifications.

Push needs credentials in EAS, set up once with `bunx eas credentials`:

- iOS: an APNs key (paid Apple Developer account). Simulators get no push.
- Android: Firebase project `mailmark-mobile`, whose `google-services.json`
  (public identifiers only) is committed and referenced from `app.json`. Its
  FCM V1 service account key is secret: upload it to EAS, never commit it
  (`.gitignore` blocks the usual file names).

Where no push token can be had (simulator, a build without Firebase), the app
falls back to an OS-scheduled background check (expo-background-task) with the
website's queries and local notifications. The OS decides when it runs (about
every 15 minutes at best), so those are not instant.

### Clerk

In the Clerk dashboard for the website's instance, allow the native app:
add the bundle identifier / package `dev.mailmark.app` under Native
applications so hosted sign-in can return to the app.

## Scripts

| Command | What it does |
| --- | --- |
| `bun start` | Metro for a development build |
| `bun run ios` / `bun run android` | Start and open on a simulator/device |
| `bun run web` | Web build (limited: native tabs fall back to JS tabs) |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | `expo lint` |
| `bun run preview` | Single-file web preview (see `scripts/build-web-preview.mjs`) |

## Design

Two palettes, chosen by the system appearance or in Settings → Appearance,
defined in `src/constants/theme.ts`:

| | Background | Surface | Accent | Text |
| --- | --- | --- | --- | --- |
| Clean White | `#ece7df` | `#fbf9f4` | `#ce3a1b` | `#16130f` |
| Enterprise Dark | `#0f172a` | `#243044` | `#f0714f` | `#e2e8f0` |

Type: Schibsted Grotesk (UI), Fraunces (display), DM Mono (code and metrics),
loaded from `assets/fonts`. Icons map to SF Symbols on iOS and Material
Symbols elsewhere through `src/components/ui/icon.tsx`.
