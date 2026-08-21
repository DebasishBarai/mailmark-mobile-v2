import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { useWorkspace } from '@/store/workspace';

export default function WorkspaceLayout() {
  const theme = useTheme();
  const { mailboxes } = useWorkspace();
  const unread = mailboxes.reduce((total, mailbox) => total + mailbox.unread, 0);

  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.backgroundElement}
      tintColor={theme.accent}
      labelStyle={{ selected: { color: theme.accent } }}>
      <NativeTabs.Trigger name="mail">
        <NativeTabs.Trigger.Label>Mail</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'tray', selected: 'tray.full.fill' }} md="inbox" />
        {unread > 0 ? (
          <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="campaigns">
        <NativeTabs.Trigger.Label>Campaigns</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'megaphone', selected: 'megaphone.fill' }}
          md="campaign"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="domains">
        <NativeTabs.Trigger.Label>Domains</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'globe', selected: 'globe.americas.fill' }} md="domain" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
