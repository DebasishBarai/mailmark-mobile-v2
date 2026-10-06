import { router, type Href } from 'expo-router';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Icon, ProgressBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { removalHint } from '@/features/domains/removal-notice';
import { useWorkspace } from '@/features/workspace/workspace';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/convex/api';
import { useLiveQuery } from '@/lib/convex/hooks';
import { local } from '@/lib/storage';

import { setupChecklist } from './checklist';

/**
 * "Hide this checklist" is remembered on this device, per account. Held in
 * one place so hiding it on one tab hides it on the other straight away.
 */
const hidden = new Map<string, boolean>();
const listeners = new Set<() => void>();
const hiddenKey = (userId: string) => `setupChecklistHidden.${userId}`;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setHidden(userId: string, value: boolean) {
  hidden.set(userId, value);
  listeners.forEach((l) => l());
}

/** True or false once known; undefined while still being read from storage. */
function useHidden(userId: string | undefined): boolean | undefined {
  const value = useSyncExternalStore(subscribe, () => (userId ? hidden.get(userId) : undefined));
  useEffect(() => {
    if (!userId || hidden.has(userId)) return;
    void local.get<boolean>(hiddenKey(userId), false).then((v) => {
      if (!hidden.has(userId)) setHidden(userId, v);
    });
  }, [userId]);
  return value;
}

/**
 * "Get set up": the five steps from signing up to a first campaign (see
 * checklist.ts), each ticking itself off from the account's own data. Shows
 * nothing until every answer is in, once all five are done, or once hidden.
 * Same card as the website's dashboard.
 */
export function SetupChecklist({
  style,
  fallback = null,
  wrap = (card) => card,
}: {
  style?: ViewStyle;
  /** Shown instead whenever the card is not (loading, hidden or all done). */
  fallback?: ReactNode;
  /** Places the card, e.g. in a scroll view; not applied to the fallback. */
  wrap?: (card: ReactNode) => ReactNode;
}) {
  const theme = useTheme();
  const now = useNow();
  const { domains, mailboxes } = useWorkspace();
  const me = useLiveQuery(api.users.current, {});
  const hasMailbox = (mailboxes.data?.length ?? 0) > 0;
  // Only an account with a mailbox can have sent anything.
  const campaign = useLiveQuery(api.emails.hasSentCampaign, hasMailbox ? {} : 'skip');
  const userId = me.data?._id;
  const isHidden = useHidden(userId);

  if (!userId || isHidden !== false || !domains.data || !mailboxes.data) return fallback;
  if (hasMailbox && campaign.status !== 'success') return fallback;

  const list = setupChecklist({ domains: domains.data, mailboxes: mailboxes.data, hasCampaign: campaign.data ?? false });
  if (list.current === null) return fallback;
  const hint = list.waitingForDns && list.domain ? removalHint(list.domain._creationTime, now) : null;

  return wrap(
    <Card padded={false} style={style}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="heading" style={styles.flex}>
            Get set up
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {list.doneCount} of {list.steps.length} done
          </ThemedText>
        </View>
        <ProgressBar value={list.doneCount / list.steps.length} />
      </View>

      {list.steps.map((step, i) => {
        const current = step.id === list.current;
        return (
          <View
            key={step.id}
            style={[styles.step, { borderTopColor: theme.border }, current && { backgroundColor: theme.accentSoft }]}
            accessibilityLabel={`${step.done ? 'Done' : current ? 'Next' : 'Later'}: ${step.title}`}>
            <View
              style={[
                styles.badge,
                step.done
                  ? { backgroundColor: theme.successSoft }
                  : current
                    ? { backgroundColor: theme.accent }
                    : { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
              ]}>
              {step.done ? (
                <Icon name="check" size={13} color={theme.success} />
              ) : (
                <ThemedText type="caption" style={{ color: current ? theme.accentText : theme.textMuted }}>
                  {i + 1}
                </ThemedText>
              )}
            </View>
            <View style={styles.body}>
              <ThemedText
                type={current ? 'smallStrong' : 'small'}
                themeColor={current ? 'text' : 'textSecondary'}
                style={step.done ? styles.doneTitle : undefined}>
                {step.title}
              </ThemedText>
              {current ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    {step.detail}
                  </ThemedText>
                  {hint && step.id === 'dns' ? (
                    <ThemedText type="caption" themeColor={hint.urgent ? 'danger' : 'textMuted'}>
                      {hint.text}
                    </ThemedText>
                  ) : null}
                  <Button
                    title={step.action}
                    size="sm"
                    style={styles.action}
                    onPress={() => router.push(step.route as Href)}
                  />
                </>
              ) : null}
            </View>
          </View>
        );
      })}

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title="Hide this checklist"
          variant="ghost"
          size="sm"
          onPress={() => {
            setHidden(userId, true);
            void local.set(hiddenKey(userId), true);
          }}
        />
      </View>
    </Card>,
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  doneTitle: {
    textDecorationLine: 'line-through',
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
  },
  footer: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
