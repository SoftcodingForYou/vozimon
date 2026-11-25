// Game buttons and their (configurable) keyboard keys. No React, no DOM.

export type Btn = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'menu' | 'dex' | 'types' | 'map';
export type DirBtn = 'up' | 'down' | 'left' | 'right';
export type KeyBindings = Record<Btn, string>;

export const BTN_ORDER: Btn[] = ['up', 'down', 'left', 'right', 'a', 'b', 'menu', 'dex', 'types', 'map'];

export const BTN_NAMES: Record<Btn, string> = {
  up: 'Arriba',
  down: 'Abajo',
  left: 'Izquierda',
  right: 'Derecha',
  a: 'A: aceptar',
  b: 'B: volver y correr',
  menu: 'Menú',
  dex: 'Vozidex',
  types: 'Tabla de tipos',
  map: 'Mapa',
};

export const DEFAULT_KEYS: KeyBindings = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  a: ' ',
  b: 'x',
  menu: 'q',
  dex: 'e',
  types: 't',
  map: 'm',
};

/**
 * While typing a name, letter keys write letters, so these keys confirm and go back instead
 * (Retroceso erases a letter). This is the only place a button answers to a second key.
 */
export const TYPING_KEYS: Record<string, Btn> = { Enter: 'a', Escape: 'b' };

/** Keys that can't be chosen (browser shortcuts, or used to cancel). */
export const RESERVED_KEYS = ['Escape', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Tab', 'F5', 'F11', 'F12'];

/** Letters are stored lower-case, so Shift doesn't matter. */
export const normalizeKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

const KEY_LABELS: Record<string, string> = {
  ' ': 'Espacio',
  Enter: 'Intro',
  Escape: 'Esc',
  Backspace: 'Retroceso',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Shift: 'Mayús',
  CapsLock: 'Bloq Mayús',
  Delete: 'Supr',
  Insert: 'Insert',
  Home: 'Inicio',
  End: 'Fin',
  PageUp: 'RePág',
  PageDown: 'AvPág',
  ContextMenu: 'Menú',
};

/** Secret word: typed while walking in the world, it unlocks everything (see Play). Don't show it anywhere. */
export const SECRET_CODE = 'eduboss';

/** The last letters typed (lower-case), just enough to recognise the secret code. */
export function typedTail(tail: string, key: string): string {
  if (key.length !== 1 || !/\p{L}/u.test(key)) return tail;
  return (tail + key.toLocaleLowerCase('es')).slice(-SECRET_CODE.length);
}

/** The button a key press means: exactly one key per button, no extra keys. */
export function buttonForKey(bindings: KeyBindings, key: string, typing = false): Btn | null {
  const k = normalizeKey(key);
  if (typing && TYPING_KEYS[key]) return TYPING_KEYS[key];
  return BTN_ORDER.find((b) => bindings[b] === k) ?? null;
}

/** What to print on screen for a key ("Z", "Espacio", "↑"...). */
export function keyLabel(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  if (key.length === 1) return key.toLocaleUpperCase('es');
  return key;
}

/** Buttons added in later versions: older saved settings don't have a key for them yet. */
const ADDED_LATER: Btn[] = ['menu', 'dex'];
/** Free keys for those buttons when their default is already taken. */
const SPARE_KEYS = 'qedfgcvrybnhjkluiop'.split('');

/** Validate stored bindings; anything odd falls back to the defaults. */
export function sanitizeBindings(raw: unknown): KeyBindings {
  const out: KeyBindings = { ...DEFAULT_KEYS };
  const missing: Btn[] = [];
  if (raw && typeof raw === 'object') {
    for (const b of BTN_ORDER) {
      const v = (raw as Record<string, unknown>)[b];
      if (typeof v === 'string' && v.length > 0 && v.length <= 20 && !RESERVED_KEYS.includes(v)) out[b] = normalizeKey(v);
      else if (v === undefined && ADDED_LATER.includes(b)) missing.push(b);
    }
    // Settings saved with the old default action key (Z) and nothing else changed get the new one (Space).
    if (out.a === 'z' && BTN_ORDER.every((b) => b === 'a' || missing.includes(b) || out[b] === DEFAULT_KEYS[b])) out.a = DEFAULT_KEYS.a;
    // A new button keeps its default key unless the player already uses it for something else.
    const stored = BTN_ORDER.filter((b) => !missing.includes(b)).map((b) => out[b]);
    for (const b of missing) {
      if (!stored.includes(out[b])) continue;
      const free = SPARE_KEYS.find((k) => !Object.values(out).includes(k));
      if (free) out[b] = free;
    }
  }
  return new Set(Object.values(out)).size === BTN_ORDER.length ? out : { ...DEFAULT_KEYS };
}

/** Give a key to a button. If another button had that key, the two swap keys. */
export function rebind(bindings: KeyBindings, btn: Btn, key: string): KeyBindings {
  const k = normalizeKey(key);
  const next = { ...bindings };
  const other = BTN_ORDER.find((o) => o !== btn && next[o] === k);
  if (other) next[other] = bindings[btn];
  next[btn] = k;
  return next;
}
