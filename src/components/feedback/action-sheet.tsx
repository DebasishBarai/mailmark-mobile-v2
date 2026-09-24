import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActionSheetIOS, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { haptic } from '@/lib/haptics';

export type SheetOption = {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
};

export type SheetRequest = {
  title?: string;
  message?: string;
  options: SheetOption[];
};

type ActionSheetApi = { show: (request: SheetRequest) => void };

const ActionSheetContext = createContext<ActionSheetApi | null>(null);

/**
 * Long-press and "more" menus. iOS gets the system action sheet; Android and
 * web get a bottom sheet drawn here, since neither has an equivalent system
 * control that takes an arbitrary list of actions.
 */
export function ActionSheetProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<SheetRequest | null>(null);

  const show = useCallback((next: SheetRequest) => {
    haptic('medium');
    if (process.env.EXPO_OS === 'ios') {
      const labels = [...next.options.map((o) => o.label), 'Cancel'];
      const destructiveButtonIndex = next.options
        .map((o, i) => (o.destructive ? i : -1))
        .filter((i) => i >= 0);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: next.title,
          message: next.message,
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex,
        },
        (index) => {
          if (index < next.options.length) next.options[index].onPress();
        },
      );
      return;
    }
    setRequest(next);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ActionSheetContext value={value}>
      {children}
      <BottomSheet request={request} onClose={() => setRequest(null)} />
    </ActionSheetContext>
  );
}

export function useActionSheet(): ActionSheetApi {
  const ctx = use(ActionSheetContext);
  if (!ctx) throw new Error('useActionSheet must be used inside ActionSheetProvider');
  return ctx;
}

function BottomSheet({ request, onClose }: { request: SheetRequest | null; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!request} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose} accessibilityLabel="Close menu" />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surfaceRaised, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
        {request?.title ? (
          <ThemedText type="smallStrong" themeColor="textSecondary" style={styles.title} numberOfLines={2}>
            {request.title}
          </ThemedText>
        ) : null}
        {request?.message ? (
          <ThemedText type="caption" themeColor="textMuted" style={styles.title}>
            {request.message}
          </ThemedText>
        ) : null}
        {request?.options.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              option.onPress();
            }}
            style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundSelected }]}>
            {option.icon ? (
              <Icon name={option.icon} size={20} color={option.destructive ? theme.danger : theme.text} />
            ) : null}
            <ThemedText type="body" themeColor={option.destructive ? 'danger' : 'text'}>
              {option.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.two,
  },
  title: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.two,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    minHeight: 52,
    paddingHorizontal: Spacing.five,
  },
});
