import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

/**
 * Named icons used across the app, mapped to an SF Symbol on iOS and a Material
 * Symbol on Android and web. Keeping the map in one place stops the two symbol
 * vocabularies from leaking into screen code.
 */
export const Icons = {
  inbox: { ios: 'tray.full', android: 'inbox', web: 'inbox' },
  mail: { ios: 'envelope', android: 'mail', web: 'mail' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  outbox: { ios: 'tray.and.arrow.up', android: 'outbox', web: 'outbox' },
  drafts: { ios: 'doc.text', android: 'drafts', web: 'drafts' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  archive: { ios: 'archivebox', android: 'archive', web: 'archive' },
  reply: { ios: 'arrowshape.turn.up.left', android: 'reply', web: 'reply' },
  campaign: { ios: 'megaphone', android: 'campaign', web: 'campaign' },
  domain: { ios: 'globe', android: 'domain', web: 'domain' },
  dns: { ios: 'server.rack', android: 'dns', web: 'dns' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  person: { ios: 'person.crop.circle', android: 'person', web: 'person' },
  team: { ios: 'person.2', android: 'group', web: 'group' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  compose: { ios: 'square.and.pencil', android: 'edit_square', web: 'edit_square' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  check: { ios: 'checkmark', android: 'done', web: 'done' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  pending: { ios: 'clock', android: 'schedule', web: 'schedule' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  chevronUp: { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  analytics: { ios: 'chart.bar.fill', android: 'analytics', web: 'analytics' },
  chart: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  code: { ios: 'chevron.left.forwardslash.chevron.right', android: 'code', web: 'code' },
  api: { ios: 'curlybraces', android: 'api', web: 'api' },
  shield: { ios: 'checkmark.shield', android: 'shield', web: 'shield' },
  key: { ios: 'key', android: 'key', web: 'key' },
  bolt: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  rocket: { ios: 'paperplane.circle.fill', android: 'rocket_launch', web: 'rocket_launch' },
  palette: { ios: 'paintpalette', android: 'palette', web: 'palette' },
  unsubscribe: { ios: 'hand.raised', android: 'unsubscribe', web: 'unsubscribe' },
  placement: { ios: 'target', android: 'ads_click', web: 'ads_click' },
  card: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  external: { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' },
  attach: { ios: 'paperclip', android: 'attach_file', web: 'attach_file' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
  play: { ios: 'play.circle.fill', android: 'play_circle', web: 'play_circle' },
  docs: { ios: 'book', android: 'description', web: 'description' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  refresh: { ios: 'arrow.clockwise', android: 'sync', web: 'sync' },
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  moon: { ios: 'moon.stars', android: 'dark_mode', web: 'dark_mode' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof Icons;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = 20, color }: IconProps) {
  return <SymbolView name={Icons[name]} size={size} tintColor={color} resizeMode="scaleAspectFit" />;
}
