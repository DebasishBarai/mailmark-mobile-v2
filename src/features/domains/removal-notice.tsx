import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Icon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatRemovalTime, removalUrgency, unverifiedRemovalTime } from '@/lib/domain-removal';

/**
 * Warnings that an unverified domain will be removed by the nightly cleanup
 * (see src/lib/domain-removal.ts). Only ever shown for unverified domains: a
 * verified domain stays verified, so the cleanup never touches it.
 */

const READD_NOTE = "You can add it again later, but you'd need to replace your DNS records with new values.";

/** The notice on an unverified domain's screen. Refreshes every minute, so it turns red without a reload. */
export function RemovalNotice({ createdAt, domainId, domain }: { createdAt: number; domainId: string; domain: string }) {
  const theme = useTheme();
  const now = useNow();
  const removeAt = unverifiedRemovalTime(createdAt);
  const urgency = removalUrgency(removeAt, now);
  const when = formatRemovalTime(removeAt);
  const calm = urgency === 'later';

  return (
    <View style={[styles.notice, { backgroundColor: calm ? theme.warningSoft : theme.dangerSoft }]}>
      <Icon name={calm ? 'pending' : 'warning'} size={16} color={calm ? theme.warning : theme.danger} />
      <View style={styles.body}>
        <ThemedText type="smallStrong" themeColor={calm ? 'warning' : 'danger'}>
          {calm
            ? `Finish setup by ${when}`
            : urgency === 'overdue'
              ? 'This domain is about to be removed'
              : `This domain will be removed on ${when}`}
        </ThemedText>
        <ThemedText type="small" themeColor={calm ? 'warning' : 'danger'}>
          {calm
            ? `Domains that aren't verified within 7 days of being added are removed automatically. ${READD_NOTE}`
            : `It hasn't been verified yet, and domains that aren't verified within 7 days are removed automatically. Finish the records below to keep it. ${READD_NOTE}`}
        </ThemedText>
        {calm ? null : (
          <Button
            title="Request a free setup call"
            variant="secondary"
            size="sm"
            onPress={() => router.push({ pathname: '/setup-call', params: { domainId, domain } })}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
  },
});
