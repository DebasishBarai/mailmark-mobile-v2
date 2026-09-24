/**
 * Document shapes returned by the Mailmark Convex backend.
 *
 * These mirror `convex/schema.ts` in the website repository (the source of
 * truth) for the tables and fields the mobile app reads. They are written out
 * rather than generated because the backend lives in another repository; keep
 * them in step with the schema when a field the app uses changes.
 */

import type { GenericId } from 'convex/values';

export type Id<Table extends string> = GenericId<Table>;

type SystemFields<Table extends string> = {
  _id: Id<Table>;
  _creationTime: number;
};

export type UserCategory = 'beta' | 'normal' | 'admin';

export type User = SystemFields<'users'> & {
  clerkId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  category?: UserCategory;
  prefTheme?: string;
  contactCount?: number;
  recipientCount?: number;
  sendingSuspended?: boolean;
  suspendedReason?: string;
};

export type Domain = SystemFields<'domains'> & {
  userId: Id<'users'>;
  domain: string;
  verified: boolean;
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  sesDkimTokens?: string[];
  dkimRecordStatus?: boolean[];
  actualMxValue?: string;
  actualSpfValue?: string;
  actualDmarcValue?: string;
  mailFromMxVerified?: boolean;
  mailFromSpfVerified?: boolean;
  sesDkimStatus?: string;
  sesMailFromStatus?: string;
  sesVerifiedForSending?: boolean;
  mailFromRetryRequestedAt?: number;
  lastVerificationCheckAt?: number;
  lastVerificationError?: string;
  awsAccountId?: Id<'awsAccounts'>;
};

/** `domains.getById` adds the SES region the domain's identity lives in. */
export type DomainWithRegion = Domain & { region: string };

export type Mailbox = SystemFields<'mailboxes'> & {
  domainId: Id<'domains'>;
  userId: Id<'users'>;
  address: string;
  fullAddress: string;
  displayName?: string;
  signature?: string;
};

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'bounced' | 'complained' | 'blocked';

/** Folders the backend writes. `_warmup` holds warmup traffic and is never shown. */
export type Folder = 'inbox' | 'sent' | 'outbox' | 'drafts' | 'trash';

export type Email = SystemFields<'emails'> & {
  mailboxId: Id<'mailboxes'>;
  messageId: string;
  sesMessageId?: string;
  folder: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  snippet: string;
  date: number;
  read: boolean;
  starred: boolean;
  hasAttachments: boolean;
  s3Key: string;
  deliveryStatus?: DeliveryStatus;
  deliveredAt?: number;
  bounceType?: string;
  bounceSubType?: string;
  diagnosticCode?: string;
  bouncedAt?: number;
  complainedAt?: number;
  blockedAt?: number;
  blockReason?: string;
  blockDetail?: string;
  openedAt?: number;
  batchId?: string;
  clickedLinks?: { url: string; clickedAt: number }[];
  repliedAt?: number;
  inReplyTo?: string;
  scheduledAt?: number;
};

export type AttachmentMeta = { filename: string; contentType: string; size: number };

export type EmailBody = { body: string; attachments: AttachmentMeta[] };

export type AttachmentData = { filename: string; contentType: string; data: string };

export type OutgoingAttachment = { filename: string; contentType: string; data: string };

export type SenderGroup = SystemFields<'senderGroups'> & {
  domainId: Id<'domains'>;
  mailboxIds: Id<'mailboxes'>[];
  name: string;
  emails: string[];
};

export type SequenceStep =
  | { type: 'send_email'; subject: string; html: string }
  | { type: 'delay'; delayMs: number };

export type SequenceStatus = 'active' | 'paused' | 'completed';

export type SequenceStats = {
  total: number;
  active: number;
  completed: number;
  replied: number;
  bounced: number;
  cancelled: number;
};

export type Sequence = SystemFields<'sequences'> & {
  userId: Id<'users'>;
  domainId: Id<'domains'>;
  mailboxId: Id<'mailboxes'>;
  name: string;
  status: SequenceStatus;
  steps: SequenceStep[];
  createdAt: number;
  domainName: string;
  mailboxAddress: string;
  stats: SequenceStats;
};

export type EnrollmentStatus = 'active' | 'completed' | 'replied' | 'cancelled' | 'bounced';

export type SequenceEnrollment = SystemFields<'sequenceEnrollments'> & {
  sequenceId: Id<'sequences'>;
  contactEmail: string;
  mergeFields?: Record<string, string>;
  currentStep: number;
  status: EnrollmentStatus;
  enrolledAt: number;
  completedAt?: number;
  lastStepAt?: number;
};

export type Plan = 'free' | 'starter' | 'pro' | 'business';

export type UsageAndLimits = {
  plan: Plan;
  limits: {
    domains: number | null;
    mailboxes: number | null;
    emailsPerMonth: number;
    recipients: number;
  };
  usage: {
    domains: number;
    mailboxes: number;
    emailsSentThisPeriod: number;
    periodStartedAt: string;
    contacts: number;
    recipients: number;
  };
};

export type Subscription = SystemFields<'subscriptions'> & {
  userId: Id<'users'>;
  plan: 'starter' | 'pro' | 'business';
  status: 'active' | 'trialing' | 'canceled' | 'past_due';
  priceMonthly: number;
  startedAt: number;
  canceledAt?: number;
  currentPeriodEnd?: number;
  trialEndsAt?: number;
  cancelAtPeriodEnd?: boolean;
  dodoSubscriptionId?: string;
};

export type SubscriptionStatus = {
  subscription: Subscription | null;
  trialEndsAt: number;
  trialExpired: boolean;
  hasActiveSubscription: boolean;
  isBetaUser: boolean;
  isAdmin: boolean;
  hadInAppTrial: boolean;
  hasEverSubscribed: boolean;
  upgradeReason: 'new_user' | 'trial_ended' | 'subscription_ended';
  needsUpgrade: boolean;
};

export type EmailStats = {
  totalSent: number;
  totalInbox: number;
  delivered: number;
  failed: number;
  bounced: number;
  pending: number;
  opened: number;
  openRate: number;
  deliveryRate: number;
  dailyVolume: { date: string; label: string; sent: number; received: number }[];
};

export type ApiKey = SystemFields<'api_keys'> & {
  userId: Id<'users'>;
  domainId?: Id<'domains'>;
  name: string;
  keyPrefix: string;
  scope?: 'domain' | 'org';
  createdAt: number;
  lastUsedAt?: number;
  revokedAt?: number;
};

export type DomainHealthCheck = SystemFields<'domainHealthChecks'> & {
  domainId: Id<'domains'>;
  checkedAt: number;
  overallScore: number;
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  blacklisted: boolean;
  blacklistEntries?: string[];
  bounceRate: number;
  complaintRate: number;
  reputationStatus: 'healthy' | 'warning' | 'critical';
};

export type DomainHealthSummary = {
  domainId: Id<'domains'>;
  domainName: string;
  verified: boolean;
  latestCheck: DomainHealthCheck | null;
};

export type WarmupSpeed = 'slow' | 'normal' | 'fast';

export type WarmupMailbox = SystemFields<'warmupMailboxes'> & {
  mailboxId: Id<'mailboxes'>;
  domainId: Id<'domains'>;
  status: 'active' | 'paused' | 'completed';
  speed: WarmupSpeed;
  dailyLimit: number;
  sentToday: number;
  receivedToday: number;
  currentDay: number;
  healthScore: number;
  inboxRate: number;
  startedAt: number;
  lastActivityAt?: number;
  pausedReason?: string;
  completedAt?: number;
  lastSendError?: string;
  mailboxAddress: string;
  domainName: string;
};

export type WarmupEmail = SystemFields<'warmupEmails'> & {
  direction: 'outbound' | 'inbound';
  fromAddress: string;
  toAddress: string;
  subject: string;
  sentAt: number;
  openedAt?: number;
  repliedAt?: number;
  placement: 'inbox' | 'spam' | 'unknown';
  rescuedFromSpam?: boolean;
};

export type Contact = SystemFields<'contacts'> & { email: string; name: string };

export type Recipient = SystemFields<'recipients'> & { email: string; firstSeenAt: number };

export type UnsubscribeSource = 'one-click' | 'link' | 'manual';

export type Unsubscribe = SystemFields<'unsubscribes'> & {
  domainId: Id<'domains'>;
  email: string;
  unsubscribedAt: number;
  source: UnsubscribeSource;
  mailboxAddress?: string;
  domainName: string;
};

export type UnsubscribeStats = {
  total: number;
  last7Days: number;
  last30Days: number;
  bySource: Record<string, number>;
};

export type SuppressionReason = 'hard_bounce' | 'complaint' | 'manual' | 'invalid' | 'disposable';

export type Suppression = SystemFields<'suppressions'> & {
  email: string;
  reason: SuppressionReason;
  createdAt: number;
  bounceType?: string;
  bounceSubType?: string;
  diagnosticCode?: string;
  releasedAt?: number;
  releasedReason?: string;
};

export type SendBlock = SystemFields<'sendBlocks'> & {
  email: string;
  reason: string;
  detail?: string;
  path: 'compose' | 'scheduled' | 'api' | 'sequence';
  blockedAt: number;
};

export type AwsAccount = {
  _id: Id<'awsAccounts'>;
  _creationTime: number;
  alias: string;
  region: string;
  s3Bucket: string;
  roleArn: string;
  awsAccountId?: string;
  sesSandbox?: boolean;
  status: 'pending' | 'verified' | 'failed';
  lastError?: string;
  lastVerifiedAt?: number;
};

export type Affiliate = SystemFields<'affiliates'> & {
  code: string;
  status: 'pending' | 'approved' | 'rejected';
  payoutEmail: string;
  website?: string;
  audienceDescription: string;
  totalEarnedCents: number;
  totalPaidCents: number;
  totalReferrals?: number;
  activeReferrals?: number;
};

export type Referral = SystemFields<'referrals'> & {
  plan?: 'starter' | 'pro' | 'business';
  commissionCents: number;
  status: 'pending' | 'active' | 'paid' | 'canceled';
};

export type VerificationResult = { email: string; result: string; isValid: boolean; reason?: string };

export type DomainVerificationResult = {
  verified: boolean;
  dkimVerified: boolean;
  mxVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  dkimRecordStatus: boolean[];
  sesDkimStatus?: string;
  sesMailFromStatus?: string;
  error?: string;
};
