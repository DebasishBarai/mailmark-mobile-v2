import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TINTS = ['#ce3a1b', '#3f6b44', '#3a5f8a', '#8a5a2b', '#6b4b8a', '#2b7a78'];

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function tintFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

/** Initials on a colour tile, or the picture at `imageUrl` when there is one
 *  (a mailbox's profile image). */
export function Avatar({ name, size = 40, imageUrl }: { name: string; size?: number; imageUrl?: string | null }) {
  const theme = useTheme();
  const tint = tintFor(name);

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        contentFit="cover"
        transition={120}
        accessibilityIgnoresInvertColors
        style={[styles.avatar, { width: size, height: size, borderRadius: size >= 40 ? Radius.md : Radius.sm, borderColor: theme.border }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size >= 40 ? Radius.md : Radius.sm,
          backgroundColor: tint,
          borderColor: theme.border,
        },
      ]}>
      <ThemedText type="smallStrong" color="#fbf9f4" style={{ fontSize: size * 0.36 }}>
        {initialsOf(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
