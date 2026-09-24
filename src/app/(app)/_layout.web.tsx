import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { UpgradeGate } from '@/features/billing/upgrade-gate';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';

/** Native tabs are iOS/Android only; the web build uses the JS tab bar. */
export default function AppLayoutWeb() {
  const theme = useTheme();
  const { totalUnread } = useWorkspace();

  const icon = (name: IconName) => {
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Icon name={name} size={size} color={color} />;
    }
    return TabIcon;
  };

  return (
    <UpgradeGate>
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
          name="(mail)"
          options={{ title: 'Mail', tabBarIcon: icon('inbox'), tabBarBadge: totalUnread > 0 ? totalUnread : undefined }}
        />
        <Tabs.Screen name="(campaigns)" options={{ title: 'Campaigns', tabBarIcon: icon('campaign') }} />
        <Tabs.Screen name="(insights)" options={{ title: 'Insights', tabBarIcon: icon('analytics') }} />
        <Tabs.Screen name="(more)" options={{ title: 'More', tabBarIcon: icon('more') }} />
      </Tabs>
    </UpgradeGate>
  );
}
