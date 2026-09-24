import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon, type IconName } from './icon';

import { ThemedText } from '@/components/themed-text';
import { haptic } from '@/lib/haptics';

export type SwipeAction = {
  label: string;
  icon: IconName;
  color: string;
  onPress: () => void;
};

export type SwipeRowProps = {
  children: ReactNode;
  /** Revealed by swiping right (leading edge). */
  leading?: SwipeAction;
  /** Revealed by swiping left (trailing edge); first is outermost. */
  trailing?: SwipeAction[];
};

/**
 * A list row with Mail-style swipe actions. A full swipe past the threshold
 * fires the outermost action, a partial swipe reveals the buttons.
 */
export function SwipeRow({ children, leading, trailing = [] }: SwipeRowProps) {
  const ref = useRef<SwipeableMethods>(null);

  const run = (action: SwipeAction) => {
    haptic('light');
    ref.current?.close();
    action.onPress();
  };

  if (process.env.EXPO_OS === 'web') return <>{children}</>;

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      overshootFriction={8}
      leftThreshold={72}
      rightThreshold={72}
      renderLeftActions={
        leading
          ? () => (
              <ActionButton action={leading} onPress={() => run(leading)} align="left" />
            )
          : undefined
      }
      renderRightActions={
        trailing.length > 0
          ? () => (
              <View style={styles.trailing}>
                {[...trailing].reverse().map((action) => (
                  <ActionButton key={action.label} action={action} onPress={() => run(action)} align="right" />
                ))}
              </View>
            )
          : undefined
      }
      onSwipeableWillOpen={() => haptic('selection')}>
      {children}
    </ReanimatedSwipeable>
  );
}

function ActionButton({
  action,
  onPress,
  align,
}: {
  action: SwipeAction;
  onPress: () => void;
  align: 'left' | 'right';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={onPress}
      style={[styles.action, { backgroundColor: action.color }, align === 'left' ? styles.left : null]}>
      <Icon name={action.icon} size={20} color="#ffffff" />
      <ThemedText type="caption" color="#ffffff" style={styles.label}>
        {action.label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trailing: {
    flexDirection: 'row',
  },
  action: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  left: {
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
