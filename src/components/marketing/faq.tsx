import { View } from 'react-native';

import { AccordionItem } from '@/components/ui';
import { FAQ } from '@/constants/content';

export function Faq() {
  return (
    <View>
      {FAQ.map((item) => (
        <AccordionItem key={item.question} question={item.question} answer={item.answer} />
      ))}
    </View>
  );
}
