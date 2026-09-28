import type { Ref } from 'react';

import type { RichAction, RichActiveState } from './rich-editor-document';

export type RichTextEditorHandle = {
  exec: (action: RichAction, value?: string) => void;
  // Insert text at the caret, or where it was before the editor lost focus
  // (a merge field tapped above, for instance).
  insertText: (text: string) => void;
  focus: () => void;
};

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  onFocus?: () => void;
  onActiveChange?: (state: RichActiveState) => void;
  // Ctrl/Cmd+K on a hardware keyboard: the host asks for the URL.
  onRequestLink?: () => void;
  ref?: Ref<RichTextEditorHandle>;
};

// The editor grows with its content between these heights, then scrolls
// inside, so with the keyboard up the caret stays on screen.
export function editorHeightBounds(windowHeight: number): { min: number; max: number } {
  const max = Math.max(240, Math.round(windowHeight * 0.42));
  return { min: Math.min(220, max), max };
}
