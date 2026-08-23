# Mailmark for mobile

A native mobile version of [mailmark.dev](https://www.mailmark.dev) — one email platform for every
product you ship. Built with Expo SDK 57, Expo Router and React Native 0.86.

The app has two halves:

- **Marketing** (signed out) — the mailmark.dev landing page rebuilt natively: hero and inbox
  still-life, the interactive cost calculator, the four-step setup walkthrough, the SDK block,
  the feature grid, testimonials, pricing and the FAQ.
- **Workspace** (signed in) — the product itself across four native tabs: Mail, Campaigns, Domains
  and Settings.

## Getting started

```bash
bun install
bun start        # then press i / a, or scan the QR code
```

Other entry points: `bun run ios`, `bun run android`, `bun run web`.

## Single-file web preview

`bun run preview` exports the web build and packs it into one self-contained
HTML file, with every stylesheet, script, font and image inlined as a `data:`
URI. It runs from disk or any static host — no server, no network — which makes
it a way to hand someone a clickable build when they cannot run Expo Go.

```bash
bun run preview                                   # -> mailmark-preview.html
node ./scripts/build-web-preview.mjs --fragment   # <body> contents only
```

`--fragment` is for embedding in a host page that supplies its own document
skeleton. Both outputs are gitignored.

Note that this is a preview of the **web** build: `expo-router`'s native tabs
fall back to the JavaScript tab bar (see `src/app/(workspace)/_layout.web.tsx`),
so it shows the layout and flows rather than the real native chrome. Use Expo Go
for that.

> Expo Snack cannot open this project. Snack supports SDK 50–54 and this app is
> on SDK 57.

## Routes

```
src/app/
  _layout.tsx               root stack — providers, fonts, Stack.Protected auth gate
  (marketing)/index.tsx     landing page
  sign-in.tsx               sign in / start a trial (modal)
  compose.tsx               new message (modal)
  new-campaign.tsx          new campaign (modal)
  add-domain.tsx            add a product domain (modal)
  (workspace)/
    _layout.tsx             native tabs (JS tabs on web via _layout.web.tsx)
    mail/                   unified inbox, folders, mailbox filter, thread view, reply
    campaigns/              campaign list with live stats, detail with rates and sequence
    domains/                domain list, DNS record status, warming ramp, API key
    settings/               account, plan usage, appearance, links out to the web app
```

## Design

Two palettes, chosen by the system appearance setting and defined in `src/constants/theme.ts`:

| | Background | Surface | Accent | Text |
| --- | --- | --- | --- | --- |
| Clean White | `#ece7df` | `#fbf9f4` | `#ce3a1b` | `#16130f` |
| Enterprise Dark | `#0f172a` | `#243044` | `#f0714f` | `#e2e8f0` |

Both come from the theme library on mailmark.dev. The dark palette keeps a lightened terracotta
accent rather than the web theme's blue, so the brand colour survives the switch.

Type is the site's: **Schibsted Grotesk** for UI, **Fraunces** for display headings and the
wordmark, **DM Mono** for code and metrics. The files live in `assets/fonts` and load through
`expo-font`.

Icons resolve per platform through `src/components/ui/icon.tsx` — SF Symbols on iOS, Material
Symbols on Android and web, from a single named set.

## Data

The workspace runs on sample data in `src/data/mock.ts`, held in a context store
(`src/store/workspace.tsx`) that supports the real interactions: reading and starring threads,
replying, sending, adding a domain and re-checking its DNS, creating a campaign, signing out.
Swapping in the live API means replacing that store's implementation — the screens read from its
interface only.

Marketing copy is transcribed in `src/constants/content.ts`, section numbering matching the rail on
the website. The FAQ answers are the exception: the site renders them client-side, so they are
written from facts stated elsewhere on the page.
