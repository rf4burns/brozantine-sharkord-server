import type { TPttKeybind } from '@/types';

const DEFAULT_PTT_KEYBIND: TPttKeybind = {
  code: 'Backquote'
};

const MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight'
]);

const CODE_LABELS: Record<string, string> = {
  Backquote: '`',
  Space: 'Space',
  Period: '.',
  Comma: ',',
  Slash: '/',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Minus: '-',
  Equal: '=',
  Semicolon: ';',
  Quote: "'",
  CapsLock: 'Caps Lock',
  Tab: 'Tab',
  Enter: 'Enter',
  Backspace: 'Backspace'
};

const isModifierCode = (code: string) => MODIFIER_CODES.has(code);

const keybindFromKeyboardEvent = (event: KeyboardEvent): TPttKeybind => ({
  code: event.code,
  ctrl: event.ctrlKey || undefined,
  alt: event.altKey || undefined,
  shift: event.shiftKey || undefined,
  meta: event.metaKey || undefined
});

const matchesPttKeybind = (event: KeyboardEvent, keybind: TPttKeybind) => {
  if (event.code !== keybind.code) return false;

  return (
    event.ctrlKey === !!keybind.ctrl &&
    event.altKey === !!keybind.alt &&
    event.shiftKey === !!keybind.shift &&
    event.metaKey === !!keybind.meta
  );
};

const formatKeyCode = (code: string) => {
  if (CODE_LABELS[code]) return CODE_LABELS[code];

  if (code.startsWith('Key') && code.length === 4) {
    return code.slice(3);
  }

  if (code.startsWith('Digit') && code.length === 6) {
    return code.slice(5);
  }

  if (code.startsWith('Numpad')) {
    return `Num ${code.slice(6)}`;
  }

  return code;
};

const formatPttKeybind = (keybind: TPttKeybind) => {
  const parts: string[] = [];

  if (keybind.ctrl) parts.push('Ctrl');
  if (keybind.alt) parts.push('Alt');
  if (keybind.shift) parts.push('Shift');
  if (keybind.meta) parts.push('Meta');

  parts.push(formatKeyCode(keybind.code));

  return parts.join('+');
};

const normalizePttKeybind = (value: unknown): TPttKeybind => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_PTT_KEYBIND;
  }

  const candidate = value as Partial<TPttKeybind>;

  if (!candidate.code || typeof candidate.code !== 'string') {
    return DEFAULT_PTT_KEYBIND;
  }

  return {
    code: candidate.code,
    ctrl: candidate.ctrl || undefined,
    alt: candidate.alt || undefined,
    shift: candidate.shift || undefined,
    meta: candidate.meta || undefined
  };
};

export {
  DEFAULT_PTT_KEYBIND,
  formatPttKeybind,
  isModifierCode,
  keybindFromKeyboardEvent,
  matchesPttKeybind,
  normalizePttKeybind
};
