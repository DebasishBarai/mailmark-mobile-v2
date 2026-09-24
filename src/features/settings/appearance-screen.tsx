import { Group, Icon, ListRow, Screen } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

import { usePreferences, type ThemePreference } from './preferences';

const OPTIONS: { value: ThemePreference; label: string; subtitle: string }[] = [
  { value: 'system', label: 'Match system', subtitle: 'Follow your device setting' },
  { value: 'light', label: 'Light', subtitle: 'Warm paper' },
  { value: 'dark', label: 'Dark', subtitle: 'Slate' },
];

export function AppearanceScreen() {
  const theme = useTheme();
  const { prefs, update } = usePreferences();
  return (
    <Screen>
      <Group title="Theme" footer="Messages are always shown on white, as their senders designed them.">
        {OPTIONS.map((o) => (
          <ListRow
            key={o.value}
            title={o.label}
            subtitle={o.subtitle}
            icon={o.value === 'dark' ? 'moon' : o.value === 'light' ? 'palette' : 'settings'}
            showChevron={false}
            right={prefs.theme === o.value ? <Icon name="check" size={16} color={theme.accent} /> : undefined}
            onPress={() => update('theme', o.value)}
          />
        ))}
      </Group>
      <Group title="Sending">
        <ListRow
          title="Confirm before sending to invalid addresses"
          icon="shield"
          toggle={{ value: prefs.confirmSend, onChange: (v) => update('confirmSend', v) }}
        />
      </Group>
    </Screen>
  );
}
