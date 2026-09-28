import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputKeyPressEventData,
  type TextStyle,
} from 'react-native';

import { useActionSheet } from '@/components/feedback/action-sheet';
import { ThemedText } from '@/components/themed-text';
import { Button, IconButton, type IconName } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  TEXT_COLORS,
  applyEdit,
  clearFormatting,
  insertLink,
  normalizeUrl,
  toggleHtmlList,
  toggleMarkdownList,
  toggleWrap,
  type ComposeFormat,
  type TextEdit,
} from '@/lib/email/format';

import { NO_ACTIVE, type RichAction, type RichActiveState } from './rich-editor-document';
import { RichTextEditor, type RichTextEditorHandle } from './rich-text-editor';

export type ComposeBodyEditorHandle = {
  // Insert text at the caret (or where it last was), e.g. a merge field.
  insertText: (text: string) => void;
};

type Props = {
  format: ComposeFormat;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onFocus?: () => void;
  // Style for the source TextInput (plain, Markdown, HTML).
  inputStyle?: StyleProp<TextStyle>;
  ref?: Ref<ComposeBodyEditorHandle>;
};

/**
 * The message body: a formatting toolbar over either the rich text editor
 * or a source text field. In Markdown and HTML the same buttons edit the
 * source, as on the website: Bold wraps the selection in ** or <b>.
 */
export function ComposeBodyEditor({ format, value, onChange, placeholder, onFocus, inputStyle, ref }: Props) {
  const theme = useTheme();
  const sheet = useActionSheet();
  const rich = useRef<RichTextEditorHandle>(null);
  const input = useRef<TextInput>(null);
  const selection = useRef({ start: value.length, end: value.length });
  const [active, setActive] = useState<RichActiveState>(NO_ACTIVE);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const isRich = format === 'rich';
  const isSource = format === 'markdown' || format === 'html';

  // The last known caret, kept inside the text: after a format switch the
  // body is rewritten and an old position may point past its end.
  const caret = () => {
    const start = Math.min(selection.current.start, value.length);
    const end = Math.min(selection.current.end, value.length);
    return { start, end };
  };

  const applyTextEdit = (edit: TextEdit) => {
    onChange(applyEdit(value, edit));
    selection.current = { start: edit.selStart, end: edit.selEnd };
    // Put the caret back after React applies the new text.
    requestAnimationFrame(() => input.current?.setSelection?.(edit.selStart, edit.selEnd));
  };

  const applySource = (action: RichAction, arg?: string) => {
    if (!isSource) return;
    const md = format === 'markdown';
    const { start: s, end: e } = caret();
    const span = (css: string) => toggleWrap(value, s, e, `<span style="${css}">`, '</span>');
    let edit: TextEdit | null = null;
    switch (action) {
      case 'bold':
        edit = md ? toggleWrap(value, s, e, '**', '**') : toggleWrap(value, s, e, '<b>', '</b>');
        break;
      case 'italic':
        edit = md ? toggleWrap(value, s, e, '*', '*') : toggleWrap(value, s, e, '<i>', '</i>');
        break;
      case 'underline':
        edit = toggleWrap(value, s, e, '<u>', '</u>');
        break;
      case 'strike':
        edit = md ? toggleWrap(value, s, e, '~~', '~~') : toggleWrap(value, s, e, '<s>', '</s>');
        break;
      case 'bulletList':
      case 'numberList':
        edit = md
          ? toggleMarkdownList(value, s, e, action === 'numberList')
          : toggleHtmlList(value, s, e, action === 'numberList');
        break;
      case 'link':
        if (arg) edit = insertLink(value, s, e, arg, md ? 'markdown' : 'html');
        break;
      case 'clear':
        edit = clearFormatting(value, s, e, md ? 'markdown' : 'html');
        break;
      case 'font':
        if (arg) edit = span(`font-family: ${arg.replace(/"/g, "'")}`);
        break;
      case 'size':
        if (arg) edit = span(`font-size: ${arg}`);
        break;
      case 'color':
        if (arg) edit = span(`color: ${arg}`);
        break;
    }
    if (edit) applyTextEdit(edit);
  };

  const apply = (action: RichAction, arg?: string) => {
    if (isRich) rich.current?.exec(action, arg);
    else applySource(action, arg);
  };

  useImperativeHandle(ref, () => ({
    insertText: (text) => {
      if (isRich) {
        rich.current?.insertText(text);
        return;
      }
      const { start, end } = caret();
      applyTextEdit({ from: start, to: end, insert: text, selStart: start + text.length, selEnd: start + text.length });
    },
  }));

  const openLink = () => {
    setLinkUrl('');
    setLinkOpen(true);
  };

  const confirmLink = () => {
    const url = normalizeUrl(linkUrl);
    setLinkOpen(false);
    if (url) apply('link', url);
  };

  const chooseFont = () =>
    sheet.show({
      title: 'Font',
      options: FONT_FAMILIES.map((f) => ({ label: f.label, onPress: () => apply('font', f.value) })),
    });

  const chooseSize = () =>
    sheet.show({
      title: 'Text size',
      options: FONT_SIZES.map((f) => ({ label: f.label, onPress: () => apply('size', f.value) })),
    });

  const chooseColor = () =>
    sheet.show({
      title: 'Text color',
      options: TEXT_COLORS.map((c) => ({ label: c.label, onPress: () => apply('color', c.value) })),
    });

  // Hardware keyboard shortcuts in the source field. React Native reports
  // modifier keys only on web; on phones the toolbar does the same job.
  const onKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web' || !isSource) return;
    const ne = e.nativeEvent as TextInputKeyPressEventData & { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean };
    if (!(ne.ctrlKey || ne.metaKey) || ne.altKey) return;
    const key = ne.key.toLowerCase();
    let action: RichAction | null = null;
    if (!ne.shiftKey && key === 'b') action = 'bold';
    else if (!ne.shiftKey && key === 'i') action = 'italic';
    else if (!ne.shiftKey && key === 'u') action = 'underline';
    else if (ne.shiftKey && key === 'x') action = 'strike';
    else if (!ne.shiftKey && key === 'k') {
      e.preventDefault();
      openLink();
      return;
    }
    if (!action) return;
    e.preventDefault();
    apply(action);
  };

  return (
    <View style={styles.root}>
      {format !== 'plain' ? (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={false}
          accessibilityRole="toolbar"
          accessibilityLabel="Formatting"
          style={[styles.toolbar, { borderColor: theme.border }]}
          contentContainerStyle={styles.toolbarContent}>
          <ToolButton icon="font" label="Font" onPress={chooseFont} />
          <ToolButton icon="textSize" label="Text size" onPress={chooseSize} />
          <ToolButton icon="bold" label="Bold" onPress={() => apply('bold')} on={isRich && active.bold} />
          <ToolButton icon="italic" label="Italic" onPress={() => apply('italic')} on={isRich && active.italic} />
          <ToolButton icon="underline" label="Underline" onPress={() => apply('underline')} on={isRich && active.underline} />
          <ToolButton icon="strikethrough" label="Strikethrough" onPress={() => apply('strike')} on={isRich && active.strike} />
          <ToolButton icon="palette" label="Text color" onPress={chooseColor} />
          <ToolButton icon="listBullet" label="Bulleted list" onPress={() => apply('bulletList')} on={isRich && active.bulletList} />
          <ToolButton icon="listNumber" label="Numbered list" onPress={() => apply('numberList')} on={isRich && active.numberList} />
          <ToolButton icon="link" label="Insert link" onPress={openLink} />
          <ToolButton icon="clearFormat" label="Remove formatting" onPress={() => apply('clear')} />
        </ScrollView>
      ) : null}

      {isRich ? (
        <RichTextEditor
          ref={rich}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={onFocus}
          onActiveChange={setActive}
          onRequestLink={openLink}
        />
      ) : (
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          onSelectionChange={(e) => (selection.current = e.nativeEvent.selection)}
          onKeyPress={onKeyPress}
          multiline
          scrollEnabled={false}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Message body"
          textAlignVertical="top"
          autoCapitalize={format === 'html' ? 'none' : 'sentences'}
          autoCorrect={format !== 'html'}
          style={[inputStyle, { color: theme.text, fontFamily: format === 'plain' ? Fonts.sans : Fonts.mono }]}
        />
      )}

      <Modal visible={linkOpen} transparent animationType="fade" onRequestClose={() => setLinkOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={() => setLinkOpen(false)} />
        <View style={styles.dialogWrap} pointerEvents="box-none">
          <View style={[styles.dialog, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <ThemedText type="subheading">Insert link</ThemedText>
            <TextInput
              value={linkUrl}
              onChangeText={setLinkUrl}
              onSubmitEditing={confirmLink}
              placeholder="https://"
              placeholderTextColor={theme.textMuted}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              accessibilityLabel="Link URL"
              style={[styles.linkInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
            />
            <View style={styles.dialogActions}>
              <Button title="Cancel" variant="ghost" size="sm" onPress={() => setLinkOpen(false)} />
              <Button title="Insert" size="sm" disabled={!normalizeUrl(linkUrl)} onPress={confirmLink} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToolButton({ icon, label, onPress, on = false }: { icon: IconName; label: string; onPress: () => void; on?: boolean }) {
  const theme = useTheme();
  return <IconButton icon={icon} label={label} size={18} filled={on} color={on ? theme.accent : theme.textSecondary} onPress={onPress} />;
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.two,
  },
  toolbar: {
    flexGrow: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
  },
  toolbarContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.five,
  },
  dialog: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  linkInput: {
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
