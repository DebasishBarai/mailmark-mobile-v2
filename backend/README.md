# Backend extension for the mobile app

The mobile app is a client of the **existing** Mailmark backend (the Convex
deployment in the website repository). It calls the same public queries,
mutations and actions the website calls; see `src/lib/convex/api.ts` for the
full list.

A few mobile features need things the website never needed. They live in one
additive patch, `mailmark-mobile-backend.patch`, to apply to the website
repository. Nothing in it changes an existing function's arguments or return
shape, and the website does not use any of it.

The app works without the patch: it asks `mobile:capabilities` once at
startup and, when that function does not exist, turns the dependent features
off and says why (Settings → Notifications) instead of failing.

## What the patch adds

| File | Change | Why |
| --- | --- | --- |
| `convex/mobile.ts` | **new** | `capabilities`, `registerPushToken`, `unregisterPushToken`, `getNotificationPreferences`, `setNotificationPreferences`, `campaignRecipients` |
| `convex/pushNotifications.ts` | **new** | Sends notifications through the Expo push service; removes dead tokens; throttles campaign bounce storms to one notification per hour |
| `convex/schema.ts` | +3 tables | `pushTokens`, `notificationPreferences`, `notificationThrottle` |
| `convex/http.ts` | +6 lines in `/ingestEmail` | Schedules `notifyNewEmail` for real (non-warmup) inbound mail |
| `convex/emails.ts` | `applyDeliveryEvent`, `markScheduledAsSent` | Schedules `notifyDeliveryProblem` on the first bounce/complaint of a sent message, and `notifyCampaignSent` when the last queued message of a scheduled campaign goes out |
| `convex/domains.ts` | `updateVerification` | Schedules `notifyDomainVerified` when a domain flips to verified |

Every notification is scheduled with `ctx.scheduler.runAfter(0, …)`, so a push
can never slow down or fail the write that triggered it.

`campaignRecipients` reads one campaign through the existing `by_batch` index,
scoped to mailboxes the caller owns. Without it the app shows a campaign from
the recent Sent/Outbox pages it has loaded (which is what the website does) and
says so when a very large campaign may be incomplete.

## Applying it

From the website repository root:

```bash
git apply /path/to/mailmark-mobile-v2/backend/mailmark-mobile-backend.patch
bunx convex dev        # regenerates convex/_generated and pushes the schema
```

Verified against the website snapshot this app was built from: the patch
applies cleanly, `tsc --noEmit` passes, `bun test` passes (231 tests), the two
new files lint clean, and lint results on the edited files are unchanged.

Optional environment variable on the Convex deployment:

- `EXPO_ACCESS_TOKEN`: only needed if "Enhanced push security" is enabled for
  the Expo project.

## Notification payload contract

`pushNotifications.ts` sends, and `src/features/notifications/push.ts` reads:

| Field | Values |
| --- | --- |
| `data.url` | In-app path to open: `/email/{id}`, `/campaign/{batchId}`, `/domain/{id}` |
| `data.type` | `new_mail`, `reply`, `bounce`, `delivery_issue`, `campaign_completed`, `account` |
| `data.emailId`, `data.mailboxId`, `data.batchId` | For actions (Reply, Mark as read) |
| `channelId` | Android channel: `mail`, `campaigns`, `account` |
| `categoryId` | `email_message` (Reply, Mark as read) or `campaign_update` (View campaign) |

The app only follows paths that match its own routes (`safeAppPath`), never an
arbitrary URL from a payload.

## Universal links / App Links (optional)

`app.json` declares `www.mailmark.dev` as an associated domain so links to
`/mailbox/…`, `/domains/…` and `/dashboard` open in the app
(`src/app/+native-intent.tsx` maps website paths to app screens). For the OS
to hand those links to the app, the website must serve:

- `https://www.mailmark.dev/.well-known/apple-app-site-association` listing the
  app ID `<TEAMID>.dev.mailmark.app` for those paths, and
- `https://www.mailmark.dev/.well-known/assetlinks.json` with the Android
  signing certificate fingerprint for `dev.mailmark.app`.

Until then, `mailmark://` links (used by notifications) work on their own.

## Known backend limitations the app works around

- **Drafts**: the backend has a `drafts` folder but no function to save one.
  The app autosaves drafts on the device and lists them at the top of Drafts.
- **Threads**: messages are stored flat and outgoing mail has no
  `In-Reply-To`, so there is no server-side thread. The app assembles a
  conversation from the mailbox's recent inbox and sent mail with the same
  normalised subject and a shared participant.
- **Archive**: there is no archive folder. Moving mail to a folder the website
  does not list would hide it there, so swipe actions use Trash (with undo).
- **Follow-up merge fields**: the sequence processor substitutes `{{key}}`,
  while first sends use `{Field}`. The app rewrites `{Field}` to `{{Field}}` in
  follow-ups and warns about fields it cannot express (spaces, fallbacks).
  Fixing `sequenceProcessing.interpolate` to accept `{Field}` would remove the
  difference for the website too.
