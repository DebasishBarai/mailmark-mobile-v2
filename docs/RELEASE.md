# Releasing to the App Store and Google Play

The build side is done: `eas.json` has a `production` profile (store builds,
remote build numbers with `autoIncrement`), and Android production `.aab`
builds already succeed on EAS. What is left is accounts, credentials, store
listings, and the App Review blockers listed at the end.

## 1. Accounts

| Store | Account | Cost |
| --- | --- | --- |
| Apple | [Apple Developer Program](https://developer.apple.com/programs/) | $99 / year |
| Google | [Play Console](https://play.google.com/console/signup) | $25 once |

A **new personal** Play Console account must run a closed test with at least
12 testers for 14 continuous days before it can apply for production access.
Organization accounts (needs a D-U-N-S number) skip this. Start the closed
test early: it is usually the longest wait in the whole process.

## 2. Sign in with Apple (Clerk)

The app shows Sign in with Apple on iOS (`expo-apple-authentication`,
`ios.usesAppleSignIn`). In the Clerk dashboard for the website's instance:

1. User & authentication → Social connections → enable **Apple**.
2. Native applications → add the iOS app with your Apple **Team ID** and
   bundle ID `dev.mailmark.app`.

EAS enables the Sign in with Apple capability on the App ID on the next iOS
build.

## 3. In-app purchases (RevenueCat)

App Review (3.1.1) and Google Play do not allow a native app to sell a
digital subscription through an outside checkout, so store builds sell the
three plans as App Store / Google Play subscriptions through
[RevenueCat](https://www.revenuecat.com). The backend half lives in the
website repo (`convex/storeSubscriptions.ts`, `/revenuecat-webhook`); it
writes store plans to the same subscriptions row web checkout uses, so plan
limits are enforced the same way.

**Deploy the website backend first.** The app calls
`storeSubscriptions:syncMine` and `accountDeletion:deleteMyAccount`, which
only exist once that change is live on Convex.

1. **Products.** In App Store Connect (one subscription group) and Play
   Console, create three monthly auto-renewing subscriptions whose ids carry
   the plan name: `mailmark_starter_monthly`, `mailmark_pro_monthly`,
   `mailmark_business_monthly`. Set prices per store; the stores take
   15-30%, so you may want them above the web prices. A free trial is an
   introductory offer on the product; the paywall shows it when present.
2. **RevenueCat project.** Add the iOS app (bundle `dev.mailmark.app`, with an
   App Store Connect in-app purchase key) and the Android app (package
   `dev.mailmark.app`, with a Play service account). Create entitlements named
   exactly `starter`, `pro` and `business`, each attached to its product in
   both stores, and put all three products as packages in the **current**
   offering.
3. **App keys.** Add the public SDK keys to the `production` profile's `env`
   in `eas.json` (they ship in the app, like the Clerk publishable key):
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (`appl_…`) and
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`goog_…`). **Without them a build
   falls back to the web checkout, which App Review rejects.**
4. **Backend env** (Convex dashboard → Settings → Environment Variables, on the
   production deployment):
   - `REVENUECAT_SECRET_API_KEY`: a RevenueCat v1 secret API key.
   - `REVENUECAT_WEBHOOK_AUTH`: any long random string, also entered as the
     Authorization header value of a RevenueCat webhook pointing at
     `https://api.mailmark.dev/revenuecat-webhook`.
   - `CLERK_SECRET_KEY`: the Clerk instance's secret key, used by account
     deletion.
5. **Test** with a sandbox Apple ID (TestFlight) and a Play license tester:
   buy, change plan, cancel, restore, and check the plan on the website's
   billing page. App Review also buys with a sandbox account, and those
   purchases unlock real plans, the same as TestFlight testers' do.

## 4. iOS build and submit

The one iOS production build so far failed with "Credentials are not set up",
because a non-interactive build cannot create them. Once, from a terminal
signed in to Expo:

```bash
bunx eas credentials --platform ios          # distribution cert, profile, APNs key
bunx eas build --platform ios --profile production
bunx eas submit --platform ios --latest
```

`eas submit` creates the App Store Connect app record if it does not exist
and uploads to TestFlight. Then in App Store Connect: fill in the listing
(below), pick the build, and submit for review.

## 5. Android submit

Create the app in Play Console (package `dev.mailmark.app`), then create a
Google Cloud service account with Play Console access and upload its JSON key
to EAS (`bunx eas credentials --platform android` → Google Service Account).
Never commit that key (`.gitignore` blocks `*service-account*.json`).

```bash
bunx eas build --platform android --profile production
bunx eas submit --platform android --latest    # goes to the internal track
```

Promote internal → closed → production in Play Console.

## 6. Store listing

Both stores:

- App name, short and full description, category (Productivity / Business).
- Icon (already in `assets/images`), screenshots: iPhone 6.9" (1320×2868)
  and Android phone. iPad screenshots are not needed: the app is iPhone only
  (`supportsTablet: false`).
- Privacy policy URL: https://www.mailmark.dev/privacy
- Support URL / email.
- **Reviewer demo account**: an email + password account with an active plan,
  a verified domain and a mailbox with some mail in it. Without one, review
  stops at the sign-in screen or the plan paywall. Put it in App Store
  Connect → App Review Information and Play Console → App access. Give the
  plan through a web subscription or the `beta` user category, not a store
  purchase, so the reviewer can still see the store paywall on a new account.
- Apple: attach the three subscriptions to the version you submit (App Store
  Connect → the version → In-App Purchases and Subscriptions); the first
  subscription has to go through review with an app version.

Apple **App Privacy** labels and Google **Data safety** form. What the app
collects and sends to Mailmark's backend:

- Contact info: name, email address (account).
- User content: emails, attachments, contacts and campaign recipient lists.
- Identifiers: user ID (Clerk), device push token.
- Photos and videos, only the ones the user attaches to an email.
- Purchases: subscription status.
- No tracking, no ads, no third-party analytics SDKs. Data is encrypted in
  transit (HTTPS).

Google also asks for an **account deletion URL**: a web page where people can
request deletion without installing the app. The website has no such page
yet; a page with a support address for deletion requests is enough for
Google, or a web button calling `accountDeletion:deleteMyAccount`.

## Account deletion

Settings → Account → Delete account (also on the plan paywall) calls
`accountDeletion:deleteMyAccount`. It cancels a web plan at period end,
deletes the Clerk user, then purges mailboxes, stored mail, domains (and
their SES identities) and every other per-user record in the background.
Affiliate payout records and support requests are kept. An App Store or
Google Play subscription cannot be cancelled by the server, so the app warns
first and offers the store's subscription settings.

## 7. App Review blockers

| Issue | Rule | Status |
| --- | --- | --- |
| Google sign-in without Sign in with Apple | Apple 4.8 | Fixed in the app; needs the Clerk setup in step 2 |
| iPad support without iPad layouts | Apple 2.1 / 4.0 | Fixed: iPhone only |
| Unused microphone and draw-over-apps permissions | Apple 5.1.1, Play permissions policy | Fixed: `microphonePermission: false`, `SYSTEM_ALERT_WINDOW` blocked |
| Plans bought through the Dodo web checkout | Apple 3.1.1, Play Payments policy | Fixed with in-app purchases; needs step 3 (products, RevenueCat, keys, backend deploy) |
| No restore purchases / missing subscription terms | Apple 3.1.1, 3.1.2 | Fixed: Restore purchases, renewal terms, Terms and Privacy links on the paywall and billing screen |
| No in-app account deletion | Apple 5.1.1(v), Play account deletion policy | Fixed: Settings → Account → Delete account; needs the backend deploy and `CLERK_SECRET_KEY` |
