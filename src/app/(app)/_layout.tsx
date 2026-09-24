import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { UpgradeGate } from '@/features/billing/upgrade-gate';
import { useWorkspace } from '@/features/workspace/workspace';
import { useTheme } from '@/hooks/use-theme';

/**
 * Four destinations, chosen for how Mailmark is used from a phone: triaging
 * mail, keeping an eye on campaigns, checking how sending is going, and
 * everything else (domains, mailboxes, developer, billing, settings) under
 * More. Each tab owns a native stack so its screens push with a back button.
 */
export default function AppLayout() {
  const theme = useTheme();
  const { totalUnread } = useWorkspace();

  return (
    <UpgradeGate>
      <NativeTabs
        backgroundColor={theme.background}
        indicatorColor={theme.backgroundElement}
        tintColor={theme.accent}
        labelStyle={{ selected: { color: theme.accent } }}>
        <NativeTabs.Trigger name="(mail)">
          <NativeTabs.Trigger.Label>Mail</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.fill' }} md="inbox" />
          {totalUnread > 0 ? (
            <NativeTabs.Trigger.Badge>{totalUnread > 99 ? '99+' : String(totalUnread)}</NativeTabs.Trigger.Badge>
          ) : null}
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(campaigns)">
          <NativeTabs.Trigger.Label>Campaigns</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'megaphone', selected: 'megaphone.fill' }} md="campaign" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(insights)">
          <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="analytics" />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="(more)">
          <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }}
            md="apps"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </UpgradeGate>
  );
}
