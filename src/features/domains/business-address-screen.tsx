import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { ThemedText } from '@/components/themed-text';
import { Card, ErrorState, LoadingState } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { useLiveQuery } from '@/lib/convex/hooks';
import type { Id } from '@/lib/convex/types';

import { ADDRESS_WHY, BusinessAddressForm } from './business-address';

/**
 * The business mailing address on its own, opened from the setup checklist,
 * so the owner does not have to scroll past the DNS records on the domain
 * screen. Closes once the address is saved.
 */
export function BusinessAddressScreen() {
  const theme = useTheme();
  const { domainId } = useLocalSearchParams<{ domainId: string }>();
  const domain = useLiveQuery(api.domains.getById, domainId ? { domainId: domainId as Id<'domains'> } : 'skip');

  if (domain.status === 'error') return <ErrorState error={domain.error} />;
  if (domain.status === 'loading') return <LoadingState label="Loading domain" />;
  if (!domain.data) return <ErrorState error={new Error('This domain could not be found.')} />;

  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} style={{ backgroundColor: theme.background }}>
      <View style={styles.inner}>
        <ThemedText type="body" themeColor="textSecondary">
          {ADDRESS_WHY.replace('you send.', `you send from ${domain.data.domain}.`)} A P.O. box is fine.
        </ThemedText>
        <Card padded={false}>
          <BusinessAddressForm domainId={domain.data._id} saved={domain.data.postalAddress} onSaved={() => router.back()} />
        </Card>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: 'center',
    paddingBottom: Spacing.eight,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.four,
  },
});
