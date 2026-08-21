export type DnsRecordType = 'MX' | 'SPF' | 'DKIM' | 'DMARC';
export type DnsStatus = 'verified' | 'pending' | 'failed';

export type DnsRecord = {
  type: DnsRecordType;
  host: string;
  value: string;
  status: DnsStatus;
};

export type Domain = {
  id: string;
  /** The product this domain belongs to, as shown across the dashboard. */
  product: string;
  domain: string;
  addedAt: string;
  records: DnsRecord[];
  /** Day of the 28-day inbox warming ramp, or `null` once warming has finished. */
  warmingDay: number | null;
  reputation: number;
  apiKeyPreview: string;
};

export type Mailbox = {
  id: string;
  address: string;
  domainId: string;
  displayName: string;
  signature: string;
  unread: number;
};

export type MailFolder = 'inbox' | 'sent' | 'outbox' | 'drafts' | 'trash';

export type Message = {
  id: string;
  from: string;
  fromAddress: string;
  body: string;
  sentAt: string;
  outbound: boolean;
};

export type Thread = {
  id: string;
  mailboxId: string;
  folder: MailFolder;
  subject: string;
  correspondent: string;
  correspondentAddress: string;
  preview: string;
  receivedAt: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  messages: Message[];
};

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent';

export type FollowUpStage = {
  stage: number;
  label: string;
  delayDays: number;
  sent: boolean;
};

export type Campaign = {
  id: string;
  name: string;
  subject: string;
  mailboxId: string;
  status: CampaignStatus;
  date: string;
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  stages: FollowUpStage[];
};

export type Account = {
  name: string;
  email: string;
  company: string;
  planId: 'starter' | 'pro' | 'business';
  sendsThisMonth: number;
  trialDaysLeft: number | null;
};
