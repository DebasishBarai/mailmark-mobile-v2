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

`.env.local` is gitignored, so EAS cloud builds never see it. Store the same
values as EAS environment variables once (the `preview`/`production` profiles
read the matching EAS environment, see `eas.json`):

```bash
for env in development preview production; do
  bunx eas env:create --environment $env --visibility plaintext \
    --name EXPO_PUBLIC_CONVEX_URL --value https://<your-deployment>.convex.cloud
  bunx eas env:create --environment $env --visibility plaintext \
    --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_...
done
```

`EXPO_PUBLIC_*` values are inlined into the JS bundle at build time, so a build
made before they were set has to be rebuilt.

### Backend

None. The app needs no backend or database changes: it calls only Convex
functions the website already calls, with the same arguments (the list is in
`src/lib/convex/api.ts`).

### Notifications

Mailmark has no server push, so the app checks for new mail and bounces with
an OS-scheduled background task (expo-background-task) using the same queries
the website uses, and shows local notifications. The OS decides when the check
runs (about every 15 minutes at best on Android; iOS schedules it by usage), so
notifications are timely but not instant. Turn them on in More → Notifications.

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
