import type { DomainWithRegion } from '@/lib/convex/types';
import { mergeSpfInclude } from '@/lib/spf';

/**
 * What an owner has to do about a record. Only the DKIM records decide whether
 * the domain verifies, so they are the whole of "required". The root MX is its
 * own group because publishing it moves the domain's inbox to Mailmark: anyone
 * already receiving mail there through another provider would stop getting it.
 */
export type DnsRecordGroup = 'required' | 'recommended' | 'receiving';

export const DNS_RECORD_GROUPS: DnsRecordGroup[] = ['required', 'recommended', 'receiving'];

export type DnsRecord = {
  key: string;
  group: DnsRecordGroup;
  type: 'CNAME' | 'MX' | 'TXT';
  /** Host relative to the domain; "@" is the domain itself. */
  name: string;
  value: string;
  priority?: string;
  purpose: string;
  explanation: string;
  verified: boolean;
  /** What DNS currently answers, when it is wrong. */
  current?: string;
  /** Extra instruction shown under the value, when there is one. */
  note?: string;
};

/**
 * The records a domain needs, built exactly as the website's domain page
 * builds them (DKIM CNAMEs from SES, inbound MX in the identity's region,
 * SPF, DMARC and the custom MAIL FROM pair), with the same verified flags.
 */
export function dnsRecords(domain: DomainWithRegion): DnsRecord[] {
  const region = domain.region;
  const dkimStatus = domain.dkimRecordStatus ?? [];
  // A domain may only have one SPF record. When it already has one (Google
  // Workspace and Microsoft 365 both publish their own), adding ours as a
  // second record breaks SPF for both, so show the combined value to replace
  // it with, as the website does.
  const mergedSpf = !domain.spfVerified && domain.actualSpfValue ? mergeSpfInclude(domain.actualSpfValue) : null;
  return [
    ...(domain.sesDkimTokens ?? []).map((token, i) => ({
      key: `dkim-${i}`,
      group: 'required' as const,
      type: 'CNAME' as const,
      name: `${token}._domainkey`,
      value: `${token}.dkim.amazonses.com`,
      purpose: `DKIM ${i + 1}`,
      explanation: 'Proves mail from your domain is authentic and unaltered.',
      verified: dkimStatus[i] ?? false,
    })),
    {
      key: 'mx',
      group: 'receiving',
      type: 'MX',
      name: '@',
      priority: '10',
      value: `inbound-smtp.${region}.amazonaws.com`,
      purpose: 'Receiving',
      explanation: 'Delivers mail sent to your domain to Mailmark.',
      verified: domain.mxVerified,
      current: domain.mxVerified ? undefined : domain.actualMxValue?.replace(/^\d+\s+/, ''),
    },
    {
      key: 'spf',
      group: 'recommended',
      type: 'TXT',
      name: '@',
      value: mergedSpf ?? 'v=spf1 include:amazonses.com ~all',
      purpose: 'SPF',
      explanation: 'Lists the servers allowed to send as your domain.',
      verified: domain.spfVerified,
      current: domain.spfVerified ? undefined : domain.actualSpfValue,
      note: mergedSpf
        ? 'You already have a record that starts with v=spf1. Edit that record and replace its value with the one above. Do not add a second one, because two of these records cancel each other out.'
        : undefined,
    },
    {
      key: 'dmarc',
      group: 'recommended',
      type: 'TXT',
      name: '_dmarc',
      // p=none, as the website recommends: quarantine from day one sends a small
      // business's invoices and booking emails from not-yet-authenticated tools
      // to spam. Verification accepts any v=DMARC1 record.
      value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain.domain}`,
      purpose: 'DMARC',
      explanation: 'Tells receivers what to do with mail that fails authentication.',
      verified: domain.dmarcVerified,
      current: domain.dmarcVerified ? undefined : domain.actualDmarcValue,
    },
    {
      key: 'mailfrom-mx',
      group: 'recommended',
      type: 'MX',
      name: 'mail',
      priority: '10',
      value: `feedback-smtp.${region}.amazonses.com`,
      purpose: 'MAIL FROM',
      explanation: 'A dedicated bounce domain that keeps SPF aligned.',
      verified: domain.mailFromMxVerified ?? false,
    },
    {
      key: 'mailfrom-spf',
      group: 'recommended',
      type: 'TXT',
      name: 'mail',
      value: 'v=spf1 include:amazonses.com ~all',
      purpose: 'MAIL FROM SPF',
      explanation: 'SPF for the bounce domain.',
      verified: domain.mailFromSpfVerified ?? false,
    },
  ];
}

export function fullHost(record: DnsRecord, domain: string) {
  return record.name === '@' ? domain : `${record.name}.${domain}`;
}

export function zoneFile(domain: string, records: DnsRecord[]): string {
  const lines = [`; Mailmark DNS records for ${domain}`, `; Generated on ${new Date().toISOString().split('T')[0]}`, `$ORIGIN ${domain}.`, ''];
  for (const r of records) {
    let line: string;
    if (r.type === 'CNAME') line = `${r.name}\tIN\tCNAME\t${r.value}.`;
    else if (r.type === 'MX') line = `${r.name}\tIN\tMX\t${r.priority ?? '10'}\t${r.value}.`;
    else line = `${r.name}\tIN\tTXT\t"${r.value}"`;
    // An unpublished receiving MX ships commented out, so importing the file
    // cannot move the inbox by accident. Once verified the owner receives here,
    // and an export carried to a new DNS host has to keep it live.
    if (r.group === 'receiving' && !r.verified) {
      lines.push('; Optional. Only to receive email in Mailmark. This replaces your current inbox provider.');
      lines.push(`; ${line}`);
    } else {
      lines.push(line);
    }
  }
  return lines.join('\n') + '\n';
}

/** Mirrors convex/lib/mailFromRetry.ts. */
export function canRetryMailFrom(domain: { sesMailFromStatus?: string; mailFromMxVerified?: boolean }) {
  return (domain.sesMailFromStatus === 'FAILED' || domain.sesMailFromStatus === 'TEMPORARY_FAILURE') && (domain.mailFromMxVerified ?? false);
}

export const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
