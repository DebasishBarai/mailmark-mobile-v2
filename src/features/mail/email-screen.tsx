import { useMutation } from 'convex/react';
import { Stack, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar, Badge, Button, ErrorState, Icon, IconButton, LoadingState, Skeleton } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePreferences } from '@/features/settings/preferences';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { useRefreshKey } from '@/lib/convex/hooks';
import type { Email } from '@/lib/convex/types';
import { displayName, rawEmail, type NameMaps } from '@/lib/email/address';
import { htmlToText } from '@/lib/email/compose';
import { fullDate, timeUntil } from '@/lib/format';
import { haptic } from '@/lib/haptics';

import { AttachmentList } from './attachment-list';
import { ConversationList, useConversation } from './conversation';
import { DeliveryPanel } from './delivery-panel';
import { EmailBodyView } from './email-body-view';
import { folderLabel } from './folders';
import { useEmailActions } from './use-email-actions';
import { useEmail, type EmailLocation } from './use-email';
import { useEmailBody } from './use-email-body';
import { useNameMaps } from './use-names';

export function EmailScreen({ id, location }: { id: string; location: EmailLocation }) {
  const { key, refresh } = useRefreshKey();
  return <EmailScreenBody key={key} id={id} location={location} onRetry={refresh} />;
}

function EmailScreenBody({ id, location, onRetry }: { id: string; location: EmailLocation; onRetry: () => void }) {
  const email = useEmail(id, location);

  if (email.status === 'loading') return <LoadingState />;
  if (email.status === 'error') return <ErrorState error={email.error} onRetry={onRetry} />;
  if (!email.data) {
    return (
      <ErrorState
        title="Message not found"
        error={new Error('It may have been moved or deleted, or it is older than the most recent 500 messages in its folder.')}
        onRetry={() => router.back()}
      />
    );
  }
  return <Reader email={email.data} />;
}

function Reader({ email }: { email: Email }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs } = usePreferences();
  const actions = useEmailActions();
  const markAsRead = useMutation(api.emails.markAsRead);
  const body = useEmailBody(email);
  const names = useNameMaps([email]);
  const conversation = useConversation(email);
  const marked = useRef(false);
  const [showDetails, setShowDetails] = useState(false);
  const [imagesAllowed, setImagesAllowed] = useState(!prefs.blockRemoteImages);

  useEffect(() => {
    if (!email.read && email.folder === 'inbox' && !marked.current) {
      marked.current = true;
      markAsRead({ emailId: email._id }).catch(() => {
        marked.current = false;
      });
    }
  }, [email._id, email.read, email.folder, markAsRead]);

  const outgoing = email.folder === 'sent' || email.folder === 'outbox';
  const canReply = email.folder !== 'outbox' && email.folder !== 'drafts';

  const share = () => {
    const text = body.status === 'success' ? htmlToText(body.body.body) : email.snippet;
    void Share.share({
      title: email.subject,
      message: `${email.subject}\nFrom: ${email.from}\nDate: ${fullDate(email.date)}\n\n${text}`,
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerButtons}>
              {canReply ? (
                <IconButton icon="reply" label="Reply" color={theme.accent} onPress={() => actions.reply(email, 'reply')} />
              ) : null}
              {email.folder === 'trash' ? (
                <IconButton icon="inbox" label="Move to Inbox" color={theme.accent} onPress={() => actions.restore(email)} />
              ) : email.folder !== 'outbox' ? (
                <IconButton
                  icon="trash"
                  label="Move to Trash"
                  color={theme.accent}
                  onPress={() => {
                    void actions.trash(email);
                    router.back();
                  }}
                />
              ) : null}
              <IconButton icon="more" label="More actions" color={theme.accent} onPress={() => actions.showMenu(email)} />
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.eight + insets.bottom }]}>
        <View style={styles.inner}>
          <View style={styles.subjectRow}>
            <ThemedText type="title" selectable style={styles.flex}>
              {email.subject || '(no subject)'}
            </ThemedText>
            <IconButton
              icon={email.starred ? 'star' : 'starOutline'}
              label={email.starred ? 'Remove star' : 'Star'}
              color={email.starred ? theme.warning : theme.textMuted}
              onPress={() => actions.toggleStar(email)}
            />
          </View>
          <View style={styles.badges}>
            <Badge label={folderLabel(email.folder)} />
            {email.batchId ? (
              <Pressable onPress={() => router.push(`/campaign/${encodeURIComponent(email.batchId!)}`)}>
                <Badge label="Campaign" tone="accent" icon="campaign" />
              </Pressable>
            ) : null}
            {email.folder === 'outbox' && email.scheduledAt ? (
              <Badge label={`Sends ${timeUntil(email.scheduledAt)}`} tone="info" icon="calendar" />
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showDetails ? 'Hide recipient details' : 'Show recipient details'}
            onPress={() => {
              haptic('selection');
              setShowDetails((v) => !v);
            }}
            style={styles.sender}>
            <Avatar name={displayName(email.from, names)} size={44} />
            <View style={styles.flex}>
              <View style={styles.senderLine}>
                <ThemedText type="bodyStrong" numberOfLines={1} style={styles.flex}>
                  {displayName(email.from, names)}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {fullDate(email.date)}
                </ThemedText>
              </View>
              <View style={styles.senderLine}>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
                  to {email.to.map((a) => displayName(a, names)).join(', ') || '—'}
                  {email.cc?.length ? `, cc ${email.cc.length}` : ''}
                </ThemedText>
                <Icon name={showDetails ? 'chevronUp' : 'chevronDown'} size={12} color={theme.textMuted} />
              </View>
            </View>
          </Pressable>

          {showDetails ? <AddressDetails email={email} names={names} /> : null}

          {outgoing ? <DeliveryPanel email={email} /> : null}

          {email.folder === 'outbox' ? (
            <Button
              title="Cancel scheduled send"
              variant="danger"
              icon="stop"
              onPress={() => actions.cancelSchedule(email, () => router.back())}
            />
          ) : null}

          {body.status === 'loading' ? (
            <View style={[styles.bodySkeleton, { borderColor: theme.border }]}>
              <Skeleton width="90%" />
              <Skeleton width="75%" />
              <Skeleton width="82%" />
              <Skeleton width="40%" />
            </View>
          ) : body.status === 'error' ? (
            <ErrorState compact title="Could not load the message body" error={body.error} onRetry={body.reload} />
          ) : (
            <>
              {!imagesAllowed ? (
                <Pressable
                  onPress={() => setImagesAllowed(true)}
                  accessibilityRole="button"
                  style={[styles.imagesNotice, { backgroundColor: theme.backgroundElement }]}>
                  <Icon name="photo" size={14} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                    Remote images are blocked.
                  </ThemedText>
                  <ThemedText type="smallStrong" themeColor="accent">
                    Load images
                  </ThemedText>
                </Pressable>
              ) : null}
              <EmailBodyView html={body.body.body} blockRemoteImages={!imagesAllowed} mailboxId={email.mailboxId} />
              <AttachmentList s3Key={email.s3Key} attachments={body.body.attachments} />
            </>
          )}

          <ConversationList
            current={email}
            messages={conversation.messages}
            loading={conversation.loading}
            names={names}
          />

          {canReply ? (
            <View style={styles.replyBar}>
              <ReplyButton icon="reply" label="Reply" onPress={() => actions.reply(email, 'reply')} />
              <ReplyButton icon="replyAll" label="Reply all" onPress={() => actions.reply(email, 'replyAll')} />
              <ReplyButton icon="forward" label="Forward" onPress={() => actions.reply(email, 'forward')} />
            </View>
          ) : null}

          <Button title="Share" variant="ghost" icon="share" onPress={share} />
        </View>
      </ScrollView>

    </>
  );
}

function AddressDetails({ email, names }: { email: Email; names: NameMaps }) {
  const theme = useTheme();
  const rows: [string, string[]][] = [
    ['From', [email.from]],
    ['To', email.to],
    ...(email.cc?.length ? ([['Cc', email.cc]] as [string, string[]][]) : []),
    ...(email.bcc?.length ? ([['Bcc', email.bcc]] as [string, string[]][]) : []),
  ];
  return (
    <View style={[styles.details, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
      {rows.map(([label, addresses]) => (
        <View key={label} style={styles.detailRow}>
          <ThemedText type="caption" themeColor="textMuted" style={styles.detailLabel}>
            {label}
          </ThemedText>
          <View style={styles.flex}>
            {addresses.map((a) => (
              <ThemedText key={a} type="small" selectable>
                {displayName(a, names)} <ThemedText type="small" themeColor="textSecondary">&lt;{rawEmail(a)}&gt;</ThemedText>
              </ThemedText>
            ))}
          </View>
        </View>
      ))}
      <View style={styles.detailRow}>
        <ThemedText type="caption" themeColor="textMuted" style={styles.detailLabel}>
          Date
        </ThemedText>
        <ThemedText type="small" style={styles.flex}>
          {fullDate(email.date)}
        </ThemedText>
      </View>
    </View>
  );
}

function ReplyButton({ icon, label, onPress }: { icon: 'reply' | 'replyAll' | 'forward'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic('light');
        onPress();
      }}
      style={({ pressed }) => [styles.replyButton, { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement }]}>
      <Icon name={icon} size={18} color={theme.accent} />
      <ThemedText type="smallStrong">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  sender: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  senderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  details: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  detailLabel: {
    width: 36,
    paddingTop: 2,
  },
  bodySkeleton: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  imagesNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  replyBar: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  replyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 44,
    borderRadius: Radius.md,
  },
});
