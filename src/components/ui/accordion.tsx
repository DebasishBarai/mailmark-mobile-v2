import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';

import { Icon } from './icon';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type AccordionItemProps = {
  question: string;
  answer: string;
};

export function AccordionItem({ question, answer }: AccordionItemProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.item, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((previous) => !previous);
        }}
        style={styles.header}>
        <ThemedText type="bodyStrong" style={styles.question}>
          {question}
        </ThemedText>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} color={theme.textSecondary} />
      </Pressable>
      {open ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.answer}>
          {answer}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  question: {
    flex: 1,
  },
  answer: {
    paddingTop: Spacing.two,
    paddingRight: Spacing.five,
  },
});
