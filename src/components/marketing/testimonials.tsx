import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Card } from '@/components/ui';
import { TESTIMONIALS } from '@/constants/content';
import { Spacing } from '@/constants/theme';

const CARD_WIDTH = Math.min(300, Dimensions.get('window').width - 88);

export function Testimonials() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + Spacing.three}
      decelerationRate="fast"
      contentContainerStyle={styles.row}>
      {TESTIMONIALS.map((testimonial) => (
        <Card key={testimonial.quote} style={[styles.card, { width: CARD_WIDTH }]}>
          <ThemedText type="displaySmall" themeColor="accent">
            “
          </ThemedText>
          <ThemedText type="small">{testimonial.quote}</ThemedText>
          <View style={styles.author}>
            <Avatar name={testimonial.name} size={32} />
            <View style={styles.authorText}>
              <ThemedText type="smallStrong">{testimonial.name}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {testimonial.role}
              </ThemedText>
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.three,
    paddingRight: Spacing.four,
  },
  card: {
    gap: Spacing.two,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  authorText: {
    gap: 1,
  },
});
