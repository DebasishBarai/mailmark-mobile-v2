import * as Haptics from 'expo-haptics';

type Kind = 'selection' | 'light' | 'medium' | 'success' | 'warning' | 'error';

/**
 * Fire-and-forget haptic feedback. Web has no haptics engine, and a device
 * with haptics switched off rejects the call, so failures are swallowed.
 */
export function haptic(kind: Kind = 'light') {
  if (process.env.EXPO_OS === 'web') return;
  const run = () => {
    switch (kind) {
      case 'selection':
        return Haptics.selectionAsync();
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  run().catch(() => {});
}
