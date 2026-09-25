# Architecture

## One backend, two clients

```
                 Mailmark backend (website repo)
          Convex queries / mutations / actions · Clerk · AWS
                              │
              ┌───────────────┴───────────────┐
              │                               │
      Mailmark web (Next.js)         Mailmark mobile (this repo)
      convex/react + Clerk           convex/react + @clerk/expo
```

The app holds no business logic of its own that the backend already has, and
needs no backend or database changes. It calls only public Convex functions
the website's pages call, by name, through
`makeFunctionReference` with hand-written types (`src/lib/convex/api.ts`,
`src/lib/convex/types.ts`) because the generated `api` lives in the other
repository. Client-side logic that the website also runs client-side (body
building, merge fields, CSV parsing, reply quoting, batch grouping) is ported
with the same behaviour so both clients produce identical mail.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, React 19.2, React Compiler |
| Navigation | Expo Router: native tabs (`expo-router/unstable-native-tabs`), a native stack per tab, modals and form sheets at the root |
| Auth | `@clerk/expo` against the website's Clerk instance; token cache in expo-secure-store |
| Data | `convex/react` via `ConvexProviderWithClerk`; live subscriptions, no client cache to invalidate |
| Forms / keyboard | `react-native-keyboard-controller` (`KeyboardAwareScrollView`, `KeyboardStickyView`) |
| Native features | expo-notifications, -document-picker, -image-picker, -file-system, -sharing, -clipboard, -haptics, -local-authentication, -keep-awake, -web-browser; react-native-webview; @expo/ui date picker |

## Layout of `src/`

```
app/                    routes only; each file re-exports a screen
  _layout.tsx           providers, root stack with auth guards, observers
  +native-intent.tsx    rewrites website URLs and app links to routes
  sign-in.tsx
  (app)/_layout.tsx     native tabs (JS tabs on web: _layout.web.tsx)
  (app)/(mail)/         index, email/[id], thread/[id], mailbox/[id]
  (app)/(campaigns)/    campaigns, campaign/[id], sequence/[id]
  (app)/(insights)/     insights
  (app)/(more)/         more, domains, domain/[id], mailboxes, mailbox-settings/[id],
                        warmup, deliverability, contacts, unsubscribes, suppressions,
                        developer, api-playground, billing, notifications, security,
                        appearance, account, aws-accounts, affiliate, support
  compose.tsx           modal
  campaign-new/         modal stack: index (audience), content, follow-ups, review
  add-domain, new-mailbox, new-api-key, sender-group, signature   modals
  mailbox-picker.tsx    form sheet
features/<area>/        screens, hooks and helpers per feature
components/ui/          design-system primitives (Button, ListRow, Group, SwipeRow, states…)
components/feedback/    action sheet, toasts, connection banner
components/charts/      bar chart
lib/convex/             typed API, data hooks, error messages
lib/email/              address parsing, body building, quoting
lib/                    config, storage, formatting, CSV, merge fields, haptics, navigation
providers/              Clerk + Convex + feedback providers
```

Route groups are parenthesised so URLs stay short and match the deep links:
`/email/{id}` lives in the Mail tab's stack, `/campaign/{id}` in Campaigns',
`/domain/{id}` in More's. Each tab stack sets an `anchor`, so a deep link opens
with the right screen underneath and a working back button.

## Data layer

- `useLiveQuery` / `useLivePaginated` (`src/lib/convex/hooks.ts`) wrap Convex's
  object-form hooks so a failing query becomes an error state on screen instead
  of a thrown render error. Paginated lists use cursor pagination and load more
  on scroll.
- `useRefreshKey` powers pull-to-refresh and "Try again" by re-creating the
  subscriptions below it.
- Mutations are plain `useMutation`/`useAction` calls; the UI updates when the
  server's result arrives through the live queries. Errors are turned into the
  sentence the server wrote (`errorMessage`), the same way the website reads
  `ConvexError` data.
- Account-wide state (mailboxes, domains, selected mailbox and folder, unread
  counts) lives in `WorkspaceProvider`; the campaign index lives in a provider
  on the Campaigns stack.
- Data is read the way the website reads it: mailboxes per domain
  (`mailboxes.listByDomain`), sequences per mailbox
  (`sequenceActions.getByMailbox`), and the open message from its folder list
  (`emails.listByFolderPaginated`, paging on until found, as the website's
  mailbox page selects from its list). Links to a message therefore carry its
  mailbox and folder.

## Auth

1. `ClerkProvider` restores the session from the secure token cache.
2. `ConvexProviderWithClerk` fetches a JWT from the `convex` template and
   authenticates the socket.
3. `SessionProvider` calls `users.addUser` once per session (the website's
   `SyncUser`), exposes the user row, detects a session that ended without a
   sign-out (shown on the sign-in screen), and runs sign-out hooks (push token
   unregistration, clearing local drafts and selection) before `signOut()`.
4. The root stack uses `Stack.Protected` guards: signed-out users only reach
   `sign-in`; signed-in users never see it.
5. `UpgradeGate` shows the plan chooser when `subscriptions.currentStatus`
   says the account needs a plan, like the website's `TrialGate`.

Sign-in methods come from the Clerk instance itself: Clerk's hosted Account
Portal runs in an OS auth session, so whatever the website allows (email and
password, codes, MFA, passkeys, SSO) works without the app implementing each.

## Storage

| Data | Where |
| --- | --- |
| Clerk session token | expo-secure-store (Keychain / Keystore) via `@clerk/expo/token-cache` |
| App-lock flag | expo-secure-store |
| Theme and other preferences, last mailbox, local drafts | AsyncStorage |
| API keys | Never persisted; shown once, kept in screen memory |
| Attachment downloads | Cache directory, handed to the share sheet |

## Notifications and deep links

- Mailmark has no server push, and the app adds none. Instead an
  OS-scheduled background task (`features/notifications/background-check.ts`)
  gets a Convex token from the stored Clerk session, reads the newest inbox and
  sent mail of each mailbox with the website's queries, and raises local
  notifications for unread mail and bounces newer than the last check
  (`mail-check.ts`). The OS controls timing, so it is not instant.
- Each new email gets its own notification (the newest five; the rest are
  summed up in one) with Open, Mark as read and Reply buttons.
- While the app is open, `NotificationObserver` records what the user has seen
  (so it is never announced later), routes taps and the Open and Reply
  actions, and mirrors total unread onto the app icon badge.
- Mark as read does not open the app, so `background-check.ts` handles it at
  module scope with the stored Clerk session and a Convex HTTP client: through
  the response listener on iOS and a `registerTaskAsync` notification task on
  Android, where a background action only reaches that task.
- Notification data carries an in-app path in `data.url`; only paths matching
  app routes are followed (`safeAppPath`).
- `+native-intent.tsx` maps `mailmark://` links and website URLs
  (`/mailbox/{id}`, `/domains/{id}`, `/dashboard`, …) to screens.

## Design

The palettes and type come from the boilerplate (Mailmark's own "clean white"
and "enterprise dark" themes; Schibsted Grotesk, Fraunces, DM Mono). Screens
use native patterns: large-title headers, grouped lists, native search bars,
form sheets, swipe actions, long-press action sheets (system sheet on iOS),
toasts with undo, a Material FAB on Android and a header compose button on iOS.
Every data screen has loading skeletons, empty states, error states with retry
and pull-to-refresh. Messages always render on white, as senders design them.
Chart colours were validated for contrast and colour-vision separation in both
themes.
