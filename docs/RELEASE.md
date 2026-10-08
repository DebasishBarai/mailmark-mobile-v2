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

## 3. iOS build and submit

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

## 4. Android submit

Create the app in Play Console (package `dev.mailmark.app`), then create a
Google Cloud service account with Play Console access and upload its JSON key
to EAS (`bunx eas credentials --platform android` → Google Service Account).
Never commit that key (`.gitignore` blocks `*service-account*.json`).

```bash
bunx eas build --platform android --profile production
bunx eas submit --platform android --latest    # goes to the internal track
```

Promote internal → closed → production in Play Console.

## 5. Store listing

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
  Connect → App Review Information and Play Console → App access.

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
request deletion without installing the app.

## 6. App Review blockers

| Issue | Rule | Status |
| --- | --- | --- |
| Google sign-in without Sign in with Apple | Apple 4.8 | Fixed in the app; needs the Clerk setup in step 2 |
| iPad support without iPad layouts | Apple 2.1 / 4.0 | Fixed: iPhone only |
| Unused microphone and draw-over-apps permissions | Apple 5.1.1, Play permissions policy | Fixed: `microphonePermission: false`, `SYSTEM_ALERT_WINDOW` blocked |
| Plans bought through the Dodo web checkout | Apple 3.1.1, Play Payments policy | Open: needs in-app purchases, with backend support on the website |
| No in-app account deletion | Apple 5.1.1(v), Play account deletion policy | Open: needs a backend deletion action on the website |
