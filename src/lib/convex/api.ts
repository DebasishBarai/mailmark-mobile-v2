/**
 * Typed references to the Mailmark Convex functions the mobile app calls.
 *
 * The website imports these from `convex/_generated/api`; that module lives in
 * the website repository together with the backend, so the mobile app names
 * the same functions by path ("module:function") with `makeFunctionReference`
 * and states their argument and return types here.
 *
 * Rule: every entry is a public function the website itself calls, with the
 * same arguments. Check a new entry against the website's app/ directory
 * before adding it. The one exception is `pushTokens`, which the backend
 * added for the mobile app's push notifications (convex/pushTokens.ts).
 */

import { makeFunctionReference, type PaginationOptions, type PaginationResult } from 'convex/server';

import type {
  Affiliate,
  ApiKey,
  AttachmentData,
  AwsAccount,
  Contact,
  Domain,
  DomainHealthSummary,
  DomainVerificationResult,
  DomainWithRegion,
  Email,
  EmailBody,
  EmailStats,
  Id,
  Mailbox,
  OutgoingAttachment,
  Recipient,
  Referral,
  SendBlock,
  SenderGroup,
  Sequence,
  SequenceEnrollment,
  SequenceStep,
  SubscriptionStatus,
  Suppression,
  Unsubscribe,
  UnsubscribeStats,
  UsageAndLimits,
  User,
  VerificationResult,
  WarmupEmail,
  WarmupMailbox,
  WarmupSpeed,
} from './types';

const query = <Args extends Record<string, unknown>, Ret>(name: string) =>
  makeFunctionReference<'query', Args, Ret>(name);
const mutation = <Args extends Record<string, unknown>, Ret = null>(name: string) =>
  makeFunctionReference<'mutation', Args, Ret>(name);
const action = <Args extends Record<string, unknown>, Ret = null>(name: string) =>
  makeFunctionReference<'action', Args, Ret>(name);

type Empty = Record<string, never>;
type Paginated<Args> = Args & { paginationOpts: PaginationOptions };

type SendArgs = {
  mailboxId: Id<'mailboxes'>;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: OutgoingAttachment[];
};

export const api = {
  users: {
    current: query<Empty, User | null>('users:current'),
    addUser: action<Empty, { user: User; isNew: boolean }>('users:addUser'),
  },

  mailboxes: {
    listByDomain: query<{ domainId: Id<'domains'> }, Mailbox[]>('mailboxes:listByDomain'),
    getById: query<{ mailboxId: Id<'mailboxes'> }, Mailbox | null>('mailboxes:getById'),
    displayNamesForCurrentUser: query<Empty, { email: string; name: string }[]>(
      'mailboxes:displayNamesForCurrentUser',
    ),
    create: mutation<{ domainId: Id<'domains'>; address: string; displayName?: string }, Id<'mailboxes'>>(
      'mailboxes:create',
    ),
    updateDisplayName: mutation<{ mailboxId: Id<'mailboxes'>; displayName: string }>(
      'mailboxes:updateDisplayName',
    ),
    updateSignature: mutation<{ mailboxId: Id<'mailboxes'>; signature: string }>('mailboxes:updateSignature'),
  },

  emails: {
    listByFolderPaginated: query<
      Paginated<{ mailboxId: Id<'mailboxes'>; folder: string }>,
      PaginationResult<Email>
    >('emails:listByFolderPaginated'),
    countByFolder: query<{ mailboxId: Id<'mailboxes'>; folder: string }, number>('emails:countByFolder'),
    countUnreadByMailbox: query<{ mailboxId: Id<'mailboxes'> }, number>('emails:countUnreadByMailbox'),
    markAsRead: mutation<{ emailId: Id<'emails'> }>('emails:markAsRead'),
    markAsUnread: mutation<{ emailId: Id<'emails'> }>('emails:markAsUnread'),
    markAllAsRead: mutation<{ mailboxId: Id<'mailboxes'> }>('emails:markAllAsRead'),
    toggleStar: mutation<{ emailId: Id<'emails'> }>('emails:toggleStar'),
    moveToFolder: mutation<{ emailId: Id<'emails'>; folder: string }>('emails:moveToFolder'),
    cancelScheduledEmail: mutation<{ emailId: Id<'emails'> }>('emails:cancelScheduledEmail'),
  },

  ses: {
    sendEmail: action<SendArgs & { folder?: string; batchId?: string }, { success: boolean; messageId: string }>(
      'ses:sendEmail',
    ),
    scheduleEmail: action<SendArgs & { scheduledAt: number; batchId?: string }, unknown>('ses:scheduleEmail'),
    fetchEmailBody: action<{ s3Key: string }, EmailBody>('ses:fetchEmailBody'),
    getAttachment: action<{ s3Key: string; attachmentIndex: number }, AttachmentData>('ses:getAttachment'),
  },

  contacts: {
    namesByEmails: query<{ emails: string[] }, { email: string; name: string }[]>('contacts:namesByEmails'),
    listPageForCurrentUser: query<Paginated<Empty>, PaginationResult<Contact>>(
      'contacts:listPageForCurrentUser',
    ),
  },

  recipients: {
    listForCurrentUser: query<Paginated<Empty>, PaginationResult<Recipient>>(
      'recipients:listForCurrentUser',
    ),
  },

  verification: {
    verifyForCurrentUser: action<
      { emails: string[] },
      {
        results: VerificationResult[];
        summary: { total: number; valid: number; invalid: number; unknown: number };
      }
    >('verification:verifyForCurrentUser'),
  },

  senderGroups: {
    list: query<{ mailboxId: Id<'mailboxes'> }, SenderGroup[]>('senderGroups:list'),
    create: mutation<{ mailboxId: Id<'mailboxes'>; name: string; emails: string[] }, Id<'senderGroups'>>(
      'senderGroups:create',
    ),
    update: mutation<{ id: Id<'senderGroups'>; name: string; emails: string[] }>('senderGroups:update'),
    updateMailboxes: mutation<{ id: Id<'senderGroups'>; mailboxIds: Id<'mailboxes'>[] }>(
      'senderGroups:updateMailboxes',
    ),
    remove: mutation<{ id: Id<'senderGroups'> }>('senderGroups:remove'),
  },

  sequences: {
    getByMailbox: query<{ mailboxId: Id<'mailboxes'> }, Sequence[]>('sequenceActions:getByMailbox'),
    listEnrollmentsPage: query<
      Paginated<{ sequenceId: Id<'sequences'> }>,
      PaginationResult<SequenceEnrollment>
    >('sequenceActions:listEnrollmentsPage'),
    pause: mutation<{ sequenceId: Id<'sequences'> }>('sequenceActions:pause'),
    resume: mutation<{ sequenceId: Id<'sequences'> }>('sequenceActions:resume'),
    cancel: mutation<{ sequenceId: Id<'sequences'> }>('sequenceActions:cancel'),
    cancelEnrollment: mutation<{ enrollmentId: Id<'sequenceEnrollments'> }>('sequenceActions:cancelEnrollment'),
    createAndEnrollWithFirstSent: action<
      {
        mailboxId: Id<'mailboxes'>;
        domainId: Id<'domains'>;
        name: string;
        steps: SequenceStep[];
        contacts: { email: string; mergeFields?: Record<string, string> }[];
      },
      unknown
    >('sequenceActions:createAndEnrollWithFirstSent'),
  },

  domains: {
    listForCurrentUser: query<Empty, Domain[]>('domains:listForCurrentUser'),
    getById: query<{ domainId: Id<'domains'> }, DomainWithRegion | null>('domains:getById'),
    add: action<{ domain: string; awsAccountId?: Id<'awsAccounts'> }, { domainId: string; dkimTokens: string[] }>(
      'domainActions:add',
    ),
    verifyDns: action<{ domainId: Id<'domains'> }, DomainVerificationResult>('domainActions:verifyDns'),
    retryMailFromVerification: action<{ domainId: Id<'domains'> }, { status?: string; retriedAt: number }>(
      'domainActions:retryMailFromVerification',
    ),
    remove: action<{ domainId: Id<'domains'> }>('domainActions:remove'),
  },

  domainHealth: {
    latestForCurrentUser: query<Empty, DomainHealthSummary[]>('domainHealthQueries:latestForCurrentUser'),
  },

  warmup: {
    listForCurrentUser: query<Empty, WarmupMailbox[]>('warmupPool:listForCurrentUser'),
    startWarmup: mutation<{ mailboxId: Id<'mailboxes'>; speed: WarmupSpeed }, Id<'warmupMailboxes'>>(
      'warmupPool:startWarmup',
    ),
    pauseWarmup: mutation<{ warmupMailboxId: Id<'warmupMailboxes'> }>('warmupPool:pauseWarmup'),
    resumeWarmup: mutation<{ warmupMailboxId: Id<'warmupMailboxes'> }>('warmupPool:resumeWarmup'),
    updateSpeed: mutation<{ warmupMailboxId: Id<'warmupMailboxes'>; speed: WarmupSpeed }>(
      'warmupPool:updateSpeed',
    ),
    getRecentWarmupEmails: query<{ warmupMailboxId: Id<'warmupMailboxes'>; limit?: number }, WarmupEmail[]>(
      'warmupPool:getRecentWarmupEmails',
    ),
  },

  emailStats: {
    getForCurrentUser: query<Empty, EmailStats | null>('emailStats:getForCurrentUser'),
  },

  quotas: {
    getUsageAndLimits: query<Empty, UsageAndLimits | null>('quotas:getUsageAndLimits'),
  },

  subscriptions: {
    currentStatus: query<Empty, SubscriptionStatus | null>('subscriptions:currentStatus'),
    createCheckoutSession: action<{ plan: 'starter' | 'pro' | 'business' }, { url: string }>(
      'subscriptions:createCheckoutSession',
    ),
    cancelViaDodo: action<Empty>('subscriptions:cancelViaDodo'),
  },

  apiKeys: {
    listForCurrentUser: query<Empty, ApiKey[]>('apiKeys:listForCurrentUser'),
    revoke: mutation<{ id: Id<'api_keys'> }>('apiKeys:revoke'),
    create: action<
      { name: string; domainId?: Id<'domains'>; scope?: 'domain' | 'org' },
      { key: string; keyPrefix: string }
    >('apiKeyActions:create'),
  },

  unsubscribes: {
    listPageForCurrentUser: query<Paginated<Empty>, PaginationResult<Unsubscribe>>(
      'unsubscribe:listPageForCurrentUser',
    ),
    getStats: query<Empty, UnsubscribeStats | null>('unsubscribe:getStats'),
    addManual: mutation<{ domainId: Id<'domains'>; email: string }>('unsubscribe:addManual'),
    remove: mutation<{ unsubscribeId: Id<'unsubscribes'> }>('unsubscribe:remove'),
  },

  suppressions: {
    listForCurrentUser: query<Paginated<Empty>, PaginationResult<Suppression>>(
      'suppressions:listForCurrentUser',
    ),
    release: mutation<{ email: string; reason?: string }, { ok: boolean }>('suppressions:release'),
    addManual: mutation<{ email: string }, unknown>('suppressions:addManual'),
  },

  sendGate: {
    listBlocksForCurrentUser: query<Paginated<Empty>, PaginationResult<SendBlock>>(
      'sendGate:listBlocksForCurrentUser',
    ),
  },

  awsAccounts: {
    listForCurrentUser: query<Empty, AwsAccount[]>('awsAccounts:listForCurrentUser'),
    remove: mutation<{ accountId: Id<'awsAccounts'> }>('awsAccounts:remove'),
  },

  affiliates: {
    getMyAffiliate: query<Empty, Affiliate | null>('affiliates:getMyAffiliate'),
    getMyReferralsPage: query<Paginated<Empty>, PaginationResult<Referral>>(
      'affiliates:getMyReferralsPage',
    ),
    apply: mutation<{ payoutEmail: string; website?: string; audienceDescription: string }, unknown>(
      'affiliates:apply',
    ),
  },

  pushTokens: {
    register: mutation<{ token: string; platform: 'ios' | 'android'; newMail: boolean; bounces: boolean; displaysSilentPush?: boolean }>(
      'pushTokens:register',
    ),
    unregister: mutation<{ token: string }>('pushTokens:unregister'),
    /** Needs no session: the token is the proof. Used on sign-out and its retries. */
    unregisterDevice: mutation<{ token: string }>('pushTokens:unregisterDevice'),
    sendTest: action<Empty, { sent: number }>('pushTokens:sendTest'),
  },

  support: {
    submit: mutation<
      { name: string; email: string; subject: string; message: string },
      { ok: boolean }
    >('supportRequests:submit'),
  },
} as const;
