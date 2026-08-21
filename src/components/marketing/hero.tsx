import { StyleSheet, View } from 'react-native';

import { InboxPreview } from './inbox-preview';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { HERO } from '@/constants/content';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type HeroProps = {
  onPrimary: () => void;
  onSecondary: () => void;
};

export function Hero({ onPrimary, onSecondary }: HeroProps) {
  const theme = useTheme();

  return (
    <View style={styles.hero}>
      <View style={[styles.eyebrow, { backgroundColor: theme.accentSoft }]}>
        <ThemedText type="caption" themeColor="accent">
          {HERO.eyebrow}
        </ThemedText>
      </View>

      <ThemedText type="display">
        {HERO.titleLead}{' '}
        <ThemedText type="display" themeColor="accent" style={styles.emphasis}>
          {HERO.titleEmphasis}
        </ThemedText>{' '}
        {HERO.titleTrail}
      </ThemedText>

      <ThemedText type="body" themeColor="textSecondary">
        {HERO.body}
      </ThemedText>

      <View style={styles.actions}>
        <Button title={HERO.secondaryCta} onPress={onSecondary} iconAfter="arrowRight" />
        <Button title={HERO.primaryCta} variant="secondary" onPress={onPrimary} />
      </View>

      <InboxPreview />

      <ThemedText type="smallStrong" themeColor="textSecondary" style={styles.tagline}>
        {HERO.tagline}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.four,
    paddingTop: Spacing.five,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  emphasis: {
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  tagline: {
    textAlign: 'center',
    paddingTop: Spacing.one,
  },
});
