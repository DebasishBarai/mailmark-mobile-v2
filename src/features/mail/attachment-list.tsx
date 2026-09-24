import { useAction } from 'convex/react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/feedback/toast';
import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import type { AttachmentMeta } from '@/lib/convex/types';
import { bytes } from '@/lib/format';
import { haptic } from '@/lib/haptics';

import { shareAttachment } from './attachment-file';

function iconFor(contentType: string): IconName {
  if (contentType.startsWith('image/')) return 'photo';
  if (contentType.includes('csv') || contentType.includes('sheet') || contentType.includes('excel')) return 'table';
  return 'file';
}

export function AttachmentList({ s3Key, attachments }: { s3Key: string; attachments: AttachmentMeta[] }) {
  const theme = useTheme();
  const toast = useToast();
  const getAttachment = useAction(api.ses.getAttachment);
  const [busy, setBusy] = useState<number | null>(null);

  if (attachments.length === 0) return null;

  const open = async (index: number) => {
    setBusy(index);
    haptic('light');
    try {
      const data = await getAttachment({ s3Key, attachmentIndex: index });
      await shareAttachment(data);
    } catch (err) {
      toast.show({ message: errorMessage(err, 'Could not download this attachment.'), tone: 'error', icon: 'warning' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.list}>
      <ThemedText type="label" themeColor="textSecondary">
        {attachments.length === 1 ? '1 attachment' : `${attachments.length} attachments`}
      </ThemedText>
      {attachments.map((att, index) => (
        <Pressable
          key={`${att.filename}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`${att.filename}, ${bytes(att.size)}. Open or save`}
          disabled={busy !== null}
          onPress={() => open(index)}
          style={({ pressed }) => [
            styles.item,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.surfaceRaised, borderColor: theme.border },
          ]}>
          <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
            <Icon name={iconFor(att.contentType)} size={18} color={theme.textSecondary} />
          </View>
          <View style={styles.text}>
            <ThemedText type="smallStrong" numberOfLines={1}>
              {att.filename}
            </ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              {bytes(att.size)}
            </ThemedText>
          </View>
          {busy === index ? <ActivityIndicator color={theme.accent} /> : <Icon name="share" size={18} color={theme.accent} />}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
});
