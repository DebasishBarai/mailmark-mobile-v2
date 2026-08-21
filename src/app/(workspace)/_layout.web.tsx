import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

/**
 * Native tabs are iOS/Android only, so the web build falls back to the
 * JavaScript tab bar with the same four destinations.
 */
export default function WorkspaceLayoutWeb() {
  const theme = useTheme();
  const { mailboxes } = useWorkspace();
  const unread = mailboxes.reduce((total, mailbox) => total + mailbox.unread, 0);

  const icon =
    (name: IconName) =>
    ({ color, size }: { color: ColorValue; size: number }) => (
      <Icon name={name} size={size} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: Fonts.sansMedium },
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen
        name="mail"
        options={{
          title: 'Mail',
          tabBarIcon: icon('inbox'),
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="campaigns" options={{ title: 'Campaigns', tabBarIcon: icon('campaign') }} />
      <Tabs.Screen name="domains" options={{ title: 'Domains', tabBarIcon: icon('domain') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
