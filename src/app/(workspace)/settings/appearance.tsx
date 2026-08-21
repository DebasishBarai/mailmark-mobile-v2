import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, Card, Icon, Screen } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorSchemeName, useTheme } from '@/hooks/use-theme';

const PALETTES = [
  {
    id: 'light' as const,
    name: 'Clean White',
    description: 'Mailmark’s default: warm paper, ink, terracotta.',
    swatches: [Colors.light.background, Colors.light.surfaceRaised, Colors.light.accent, Colors.light.text],
  },
  {
    id: 'dark' as const,
    name: 'Enterprise Dark',
    description: 'Slate surfaces for low light, same terracotta accent.',
    swatches: [Colors.dark.background, Colors.dark.surfaceRaised, Colors.dark.accent, Colors.dark.text],
  },
];

export default function AppearanceScreen() {
  const theme = useTheme();
  const scheme = useColorSchemeName();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Appearance' }} />

      <ThemedText type="small" themeColor="textSecondary" style={styles.blurb}>
        The app follows your device’s light and dark setting. Change it in system settings and
        Mailmark switches with it.
      </ThemedText>

      <View style={styles.list}>
        {PALETTES.map((palette) => {
          const active = palette.id === scheme;
          return (
            <Card
              key={palette.id}
              style={[styles.card, active && { borderColor: theme.accent, borderWidth: 1 }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="subheading" style={styles.cardTitle}>
                  {palette.name}
                </ThemedText>
                {active ? <Badge label="Active" tone="success" icon="check" /> : null}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {palette.description}
              </ThemedText>
              <View style={styles.swatches}>
                {palette.swatches.map((color) => (
                  <View
                    key={color}
                    style={[styles.swatch, { backgroundColor: color, borderColor: theme.border }]}
                  />
                ))}
              </View>
            </Card>
          );
        })}
      </View>

      <Card tone="flat" style={styles.note}>
        <Icon name="palette" size={16} color={theme.accent} />
        <ThemedText type="small" themeColor="textSecondary">
          Mailmark ships 11 themes on the web — Notion, Nord, Dracula, Solarized Dark, Matrix,
          Cyberpunk, Retro 90s, Pastel Soft and High Contrast among them. The mobile app carries the
          two that map to your system appearance.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  blurb: {
    paddingTop: Spacing.four,
  },
  list: {
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  card: {
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flex: 1,
  },
  swatches: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  swatch: {
    width: 40,
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
});
