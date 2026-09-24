import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ToastInput = {
  message: string;
  icon?: IconName;
  tone?: 'default' | 'error' | 'success';
  /** An undo-style action on the toast. */
  action?: { label: string; onPress: () => void };
  durationMs?: number;
};

type ToastApi = { show: (toast: ToastInput) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** Transient confirmations ("Moved to Trash · Undo") above the tab bar. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { id: number }) | null>(null);
  const counter = useRef(0);

  const show = useCallback((next: ToastInput) => {
    counter.current += 1;
    setToast({ ...next, id: counter.current });
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDone={() => setToast(null)} /> : null}
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const ctx = use(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastView({ toast, onDone }: { toast: ToastInput; onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onDone());
    }, toast.durationMs ?? (toast.action ? 5000 : 2600));
    return () => clearTimeout(timer);
  }, [anim, onDone, toast]);

  const color = toast.tone === 'error' ? theme.danger : toast.tone === 'success' ? theme.success : theme.text;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + 96 }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          {
            backgroundColor: theme.surfaceRaised,
            borderColor: theme.border,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}>
        {toast.icon ? <Icon name={toast.icon} size={18} color={color} /> : null}
        <ThemedText type="small" color={color} style={styles.message} numberOfLines={3}>
          {toast.message}
        </ThemedText>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              toast.action?.onPress();
              onDone();
            }}>
            <ThemedText type="smallStrong" themeColor="accent">
              {toast.action.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    maxWidth: 520,
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  message: {
    flex: 1,
  },
});
