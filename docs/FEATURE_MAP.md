# Feature map: Mailmark website → Mailmark mobile

Built from a read of the website repository (Next.js app in `app/(protected)`,
Convex backend in `convex/`). "Backend" lists the Convex functions each
feature uses (typed in `src/lib/convex/api.ts`).

**No backend or database changes.** Every function the app calls is one the
website's pages call, with the same arguments, and the app reads data the
same way the website does (for example, mailboxes per domain with
`mailboxes.listByDomain`, the open message from the folder list). The
"Change" column is therefore "None" throughout.

## Mail

| Feature | Website | Backend | Mobile | Change |
| --- | --- | --- | --- | --- |
| Folders (Inbox, Sent, Outbox, Drafts, Trash) | Mailbox page folder nav | `emails.listByFolderPaginated`, `emails.countUnreadByMailbox` | Mail tab: infinite list, folder + mailbox sheet from the title, unread badge on tab and app icon | None |
| Multiple mailboxes | Sidebar per domain | `domains.listForCurrentUser`, `mailboxes.listByDomain` | Mailbox sheet grouped by domain with unread counts; last choice remembered | None |
| Read / unread, star | Buttons in reader | `emails.markAsRead/markAsUnread/toggleStar/markAllAsRead` | Auto-read on open, swipe right to toggle, long-press menu, "Mark all read" | None |
| Delete | Move to trash | `emails.moveToFolder` | Swipe to Trash with Undo toast; restore from Trash (no permanent delete, as on the website) | None |
| Archive | Not in Mailmark | — | Trash with undo instead (an extra folder would hide mail on the website) | — |
| Search | Filter over loaded page | client-side | Native header search bar over loaded mail, with a hint to load more | None |
| Display names | contacts + own mailbox names | `contacts.namesByEmails`, `mailboxes.displayNamesForCurrentUser` | Same precedence as web | None |
| Reader, HTML | Sandboxed iframe; message taken from the folder list | `emails.listByFolderPaginated`, `ses.fetchEmailBody` | Auto-height WebView, scripts blocked by CSP, links to in-app browser, `mailto:` to compose, optional remote-image blocking, tracking pixel stripped on own mail | None |
| Attachments (read) | Download | `ses.getAttachment` | Saved to cache and opened in the share sheet (Files, Quick Look, other apps) | None |
| Delivery tracking | Tick icons | fields on `emails` | Delivery timeline: sent → delivered → opened → clicked links → replied, or bounce/complaint/block detail | None |
| Threads | Not on web | `emails.listByFolderPaginated` | Conversation assembled from recent inbox+sent with the same subject and a shared participant | None (documented limitation) |
| Compose, To/Cc/Bcc | Compose panel | `ses.sendEmail` | Token recipient fields, contact suggestions, verification verdicts on chips | None |
| Plain / Markdown / HTML, preview | Yes | client (`marked`) | Same `buildBody` as web, rendered preview | None |
| Signature | Mailbox signature | `mailboxes.updateSignature` | Toggle per message; Markdown editor with preview | None |
| Reply, Reply all, Forward | Yes | client | Same quoting and reply-all de-duplication as web | None |
| Attachments (send) | File input | `ses.sendEmail` | Files, photo library, camera; size budget shown | None |
| Schedule send / cancel | Picker | `ses.scheduleEmail`, `emails.cancelScheduledEmail` | Presets + native date/time picker; cancel from Outbox or reader | None |
| Recipient verification | Debounced | `verification.verifyForCurrentUser` | Same, plus a confirm before sending to invalid addresses (setting) | None |
| Sender groups | Modal | `senderGroups.*` | Add to To field; create/edit with CSV or Sheet import | None |
| Drafts | No save function | — | Autosaved on device, listed in Drafts, reopen/discard | None (documented) |

## Campaigns

| Feature | Website | Backend | Mobile | Change |
| --- | --- | --- | --- | --- |
| Campaign list | Sent folder grouped by `batchId` | `emails.listByFolderPaginated` (sent + outbox, every mailbox) | Campaigns tab: cards with delivered/opened/clicked/replied rates, load older | None |
| Campaign detail | Recipient list in reader | same | Stat tiles, engagement funnel, recipient filters (opened, clicked, replied, pending, problems), link to follow-up sequence; notes when older pages of a very large campaign are not loaded yet | None |
| Create: CSV import, merge fields | Compose "campaign" mode | client (`parseCSV`, `resolveMergeFields`) | 4-step modal: Audience → Message → Follow-ups → Review | None |
| Google Sheets import | `/api/fetch-csv` | website API route | Same route | None |
| Multiple sending mailboxes | Mailbox chooser | — | Chooser in Audience step | None |
| Send / schedule | Per-recipient loop with `batchId` | `ses.sendEmail` / `ses.scheduleEmail` | Same, 3 in parallel, progress, stop button, per-recipient failure report, screen kept awake | None |
| Follow-up sequences | `createAndEnrollWithFirstSent` | `sequenceActions.*` | Created the same way; `{Field}` rewritten to the `{{key}}` form the sequence processor substitutes | None (web bug documented) |
| Sequence management | Follow-ups folder | `sequenceActions.getByMailbox/listEnrollmentsPage/pause/resume/cancel/cancelEnrollment` | Sequence screen: steps, stats, pause/resume/stop, enrollments with swipe-to-stop | None |

## Sending infrastructure

| Feature | Website | Backend | Mobile | Change |
| --- | --- | --- | --- | --- |
| Domains list / add | Domains page, modal | `domains.listForCurrentUser`, `domainActions.add` | List with status; add (optionally on a BYO AWS account) | None |
| DNS records & verification | Domain page | `domains.getById`, `domainActions.verifyDns`, `retryMailFromVerification` | Record cards with tap-to-copy host/value, current wrong value, "Check DNS now", MAIL FROM retry, zone file copy/share | None |
| Remove domain | Button | `domainActions.remove` | Danger zone with confirmation | None |
| Mailboxes | Domain page | `mailboxes.create/updateDisplayName/updateSignature` | Mailboxes list, mailbox settings screen, new mailbox | None |
| Warmup | Warming page | `warmupPool.*` | Cards with health, inbox rate, daily progress, speed, pause/resume, recent placements | None |
| Domain health | Domain Health page | `domainHealthQueries.latestForCurrentUser` | Score, SPF/DKIM/DMARC/blocklist checks, bounce and complaint rates against AWS limits | None |
| BYO AWS | Settings | `awsAccounts.listForCurrentUser/remove` | List, disconnect; connecting (CloudFormation) handed to the website | None |

## Audience

| Feature | Website | Backend | Mobile | Change |
| --- | --- | --- | --- | --- |
| Contacts / recipients | Audience page | `contacts.listPageForCurrentUser`, `recipients.listForCurrentUser` | Paged lists with plan usage; tap to write | None |
| Unsubscribes | Unsubscribes page | `unsubscribe.*` | Stats, list, add manual, swipe to remove | None |
| Suppressions, blocked sends | Suppressions page | `suppressions.*`, `sendGate.listBlocksForCurrentUser` | Two tabs; release by swipe; add manual | None |

## Analytics

| Feature | Website | Backend | Mobile | Change |
| --- | --- | --- | --- | --- |
| Email stats | Dashboard | `emailStats.getForCurrentUser` | Insights tab: 7-day headline, rate tiles, sent/received per day charts (tap a bar for the day) | None |
| Usage vs plan | Billing/Domains | `quotas.getUsageAndLimits` | Usage bars in Insights and Billing | None |

## Developer

| Feature | Website | Backend | Mobile | Change |
| --- | --- | --- | --- | --- |
| API keys | Developer page | `apiKeys.listForCurrentUser/revoke`, `apiKeyActions.create` | List, create (org or domain scope), one-time reveal (never stored), swipe to revoke | None |
| REST API / SDK info | Developer page | — | cURL and `mailmark-sdk` examples, base URL, docs and OpenAPI links | None |
| API playground | Not on web | public REST API | Pick an endpoint, paste a key (memory only), run, read JSON | None |

## Account

| Feature | Website | Backend | Mobile | Change |
| --- | --- | --- | --- | --- |
| Sign in / sign up | Clerk modal | Clerk + `users.addUser` | Clerk hosted auth in a system auth session, Google SSO; token in Keychain/Keystore | None |
| Plan gate | TrialGate + UpgradeModal | `subscriptions.currentStatus` | Plan chooser replaces the workspace when a plan is needed | None |
| Billing | Billing page | `subscriptions.createCheckoutSession/cancelViaDodo` | Status, usage, change plan (Dodo checkout in browser), cancel at period end | None |
| Affiliate | Affiliate page | `affiliates.*` | Apply, status, referral link with share sheet, earnings, referrals | None |
| Support | Contact page | `supportRequests.submit` | Contact form + docs links | None |
| Admin | Admin pages | admin-only functions | Not on mobile (operator tools stay on the website) | — |
| Public tools, blog, docs | Marketing site | — | Linked, not rebuilt | — |

## Mobile-only

| Feature | Implementation | Change |
| --- | --- | --- |
| Notifications (new mail, bounces and spam reports) | Instant server push (Expo Push Service) with Open / Mark as read / Reply and View campaign actions; OS-scheduled background check with local notifications where push is unavailable | `pushTokens` and `convex/push.ts` (added) |
| Notification preferences | Stored on the device and sent with the push token | `pushTokens.register` (added) |
| Deep links | `mailmark://email/{id}?mailbox=&folder=`, `thread`, `campaign`, `sequence`, `mailbox`, `domain`; website URLs via `+native-intent.tsx` | None (universal links additionally need AASA / assetlinks files on the website) |
| App lock | Face ID / Touch ID / fingerprint / passcode on launch and resume | None |
| Haptics, share sheet, clipboard | Throughout | None |
| Offline banner, queued mutations | Convex connection state | None |
