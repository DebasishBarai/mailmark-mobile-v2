import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

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
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  check: { ios: 'checkmark', android: 'done', web: 'done' },
  // SF Symbols has no double checkmark; Icon draws two on iOS.
  doubleCheck: { ios: 'checkmark', android: 'done_all', web: 'done_all' },
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
  starOutline: { ios: 'star', android: 'star_outline', web: 'star_outline' },
  replyAll: { ios: 'arrowshape.turn.up.left.2', android: 'reply_all', web: 'reply_all' },
  forward: { ios: 'arrowshape.turn.up.right', android: 'forward', web: 'forward' },
  markUnread: { ios: 'envelope.badge', android: 'mark_email_unread', web: 'mark_email_unread' },
  markRead: { ios: 'envelope.open', android: 'mark_email_read', web: 'mark_email_read' },
  more: { ios: 'ellipsis.circle', android: 'more_horiz', web: 'more_horiz' },
  filter: { ios: 'line.3.horizontal.decrease.circle', android: 'filter_list', web: 'filter_list' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  download: { ios: 'arrow.down.circle', android: 'download', web: 'download' },
  photo: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  file: { ios: 'doc', android: 'description', web: 'description' },
  table: { ios: 'tablecells', android: 'table_chart', web: 'table_chart' },
  link: { ios: 'link', android: 'link', web: 'link' },
  calendar: { ios: 'calendar.badge.clock', android: 'schedule_send', web: 'schedule_send' },
  pause: { ios: 'pause.circle', android: 'pause_circle', web: 'pause_circle' },
  resume: { ios: 'play.circle', android: 'play_circle', web: 'play_circle' },
  stop: { ios: 'stop.circle', android: 'stop_circle', web: 'stop_circle' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  cursor: { ios: 'cursorarrow.click', android: 'ads_click', web: 'ads_click' },
  bounce: { ios: 'arrow.uturn.backward.circle', android: 'undo', web: 'undo' },
  error: { ios: 'xmark.octagon', android: 'error', web: 'error' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  faceId: { ios: 'faceid', android: 'fingerprint', web: 'fingerprint' },
  wifiOff: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  heart: { ios: 'heart.text.square', android: 'monitor_heart', web: 'monitor_heart' },
  gift: { ios: 'gift', android: 'redeem', web: 'redeem' },
  help: { ios: 'questionmark.circle', android: 'help', web: 'help' },
  cloud: { ios: 'cloud', android: 'cloud', web: 'cloud' },
  block: { ios: 'nosign', android: 'block', web: 'block' },
  sequence: { ios: 'arrow.triangle.branch', android: 'account_tree', web: 'account_tree' },
  merge: { ios: 'curlybraces.square', android: 'data_object', web: 'data_object' },
  pencil: { ios: 'pencil', android: 'edit', web: 'edit' },
  signature: { ios: 'signature', android: 'draw', web: 'draw' },
  swap: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
  terminal: { ios: 'terminal', android: 'terminal', web: 'terminal' },
  user: { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  at: { ios: 'at', android: 'alternate_email', web: 'alternate_email' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof Icons;

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = 20, color }: IconProps) {
  if (name === 'doubleCheck' && process.env.EXPO_OS === 'ios') return <DoubleCheck size={size} color={color} />;
  return <SymbolView name={Icons[name]} size={size} tintColor={color} resizeMode="scaleAspectFit" />;
}

/** Two overlapping checkmarks, like Material's done_all, in the same box. */
function DoubleCheck({ size, color }: { size: number; color?: ColorValue }) {
  const mark = size * 0.72;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.mark, { left: 0, top: (size - mark) / 2 }]}>
        <SymbolView name="checkmark" size={mark} tintColor={color} resizeMode="scaleAspectFit" />
      </View>
      <View style={[styles.mark, { right: 0, top: (size - mark) / 2 }]}>
        <SymbolView name="checkmark" size={mark} tintColor={color} resizeMode="scaleAspectFit" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    position: 'absolute',
  },
});
