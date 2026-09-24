import type { DomainWithRegion } from '@/lib/convex/types';

export type DnsRecord = {
  key: string;
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
};

/**
 * The records a domain needs, built exactly as the website's domain page
 * builds them (DKIM CNAMEs from SES, inbound MX in the identity's region,
 * SPF, DMARC and the custom MAIL FROM pair), with the same verified flags.
 */
export function dnsRecords(domain: DomainWithRegion): DnsRecord[] {
  const region = domain.region;
  const dkimStatus = domain.dkimRecordStatus ?? [];
  return [
    ...(domain.sesDkimTokens ?? []).map((token, i) => ({
      key: `dkim-${i}`,
      type: 'CNAME' as const,
      name: `${token}._domainkey`,
      value: `${token}.dkim.amazonses.com`,
      purpose: `DKIM ${i + 1}`,
      explanation: 'Proves mail from your domain is authentic and unaltered.',
      verified: dkimStatus[i] ?? false,
    })),
    {
      key: 'mx',
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
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:amazonses.com ~all',
      purpose: 'SPF',
      explanation: 'Lists the servers allowed to send as your domain.',
      verified: domain.spfVerified,
      current: domain.spfVerified ? undefined : domain.actualSpfValue,
    },
    {
      key: 'dmarc',
      type: 'TXT',
      name: '_dmarc',
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain.domain}`,
      purpose: 'DMARC',
      explanation: 'Tells receivers what to do with mail that fails authentication.',
      verified: domain.dmarcVerified,
      current: domain.dmarcVerified ? undefined : domain.actualDmarcValue,
    },
    {
      key: 'mailfrom-mx',
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
    if (r.type === 'CNAME') lines.push(`${r.name}\tIN\tCNAME\t${r.value}.`);
    else if (r.type === 'MX') lines.push(`${r.name}\tIN\tMX\t${r.priority ?? '10'}\t${r.value}.`);
    else lines.push(`${r.name}\tIN\tTXT\t"${r.value}"`);
  }
  return lines.join('\n') + '\n';
}

/** Mirrors convex/lib/mailFromRetry.ts. */
export function canRetryMailFrom(domain: { sesMailFromStatus?: string; mailFromMxVerified?: boolean }) {
  return (domain.sesMailFromStatus === 'FAILED' || domain.sesMailFromStatus === 'TEMPORARY_FAILURE') && (domain.mailFromMxVerified ?? false);
}

export const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
