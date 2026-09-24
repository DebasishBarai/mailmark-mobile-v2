import { useUser } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Badge, Group, ListRow, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session';
import { WebLinks } from '@/lib/config';
import { shortDate } from '@/lib/format';

export function AccountScreen() {
  const { user: clerkUser } = useUser();
  const { user, signOut } = useSession();
  const name = user?.name || clerkUser?.fullName || '';
  const email = user?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? '';

  return (
    <Screen>
      <View style={styles.header}>
        {clerkUser?.imageUrl ? <Image source={{ uri: clerkUser.imageUrl }} style={styles.photo} /> : <Avatar name={name || email} size={72} />}
        <ThemedText type="title">{name || email}</ThemedText>
        {name ? (
          <ThemedText type="body" themeColor="textSecondary">
            {email}
          </ThemedText>
        ) : null}
        {user?.category === 'beta' ? <Badge label="Beta access" tone="info" /> : null}
        {user?.category === 'admin' ? <Badge label="Administrator" tone="info" /> : null}
      </View>

      {user?.sendingSuspended ? (
        <Group title="Sending suspended" footer={user.suspendedReason ?? 'Contact support to restore sending.'}>
          <ListRow title="Contact support" icon="help" onPress={() => WebBrowser.openBrowserAsync(`${WebLinks.docs}/troubleshooting`)} />
        </Group>
      ) : null}

      <Group title="Profile" footer="Your name, photo, email addresses and sign-in methods are shared with the website and edited there.">
        <ListRow title="Name" value={name || 'Not set'} icon="user" />
        <ListRow title="Email" value={email} icon="mail" />
        {user ? <ListRow title="Member since" value={shortDate(user._creationTime)} icon="calendar" /> : null}
        <ListRow title="Edit profile" icon="external" onPress={() => WebBrowser.openBrowserAsync(WebLinks.settings)} />
      </Group>

      <Group>
        <ListRow
          title="Sign out"
          icon="logout"
          destructive
          showChevron={false}
          onPress={() =>
            Alert.alert('Sign out of Mailmark?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
            ])
          }
        />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
  },
});
