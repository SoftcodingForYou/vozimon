// One tiny input system for keyboard, touch buttons and gamepads.
// Buttons: arrows, A, B, Q (menu), E (Vozidex), T (type chart) and M (map). Keyboard keys are configurable.

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { DEFAULT_KEYS, RESERVED_KEYS, buttonForKey, normalizeKey, type Btn, type DirBtn, type KeyBindings } from './keys';

export type { Btn, DirBtn } from './keys';

export interface InputEvt {
  btn: Btn | null;
  key: string;
  char: string | null; // a typed character (only in text mode)
  repeat: boolean;
}

type Handler = (e: InputEvt) => void;
export type InputSource = 'keyboard' | 'touch' | 'pad';

const DIRS: DirBtn[] = ['up', 'down', 'left', 'right'];
const held = new Set<Btn>();
let dirOrder: DirBtn[] = [];
let tapped: DirBtn | null = null; // a direction pressed since the last game frame
let handlers: { h: Handler; layer: number; seq: number }[] = [];
let seq = 0;
let textMode = false;
let started = false;
const firstInteraction: (() => void)[] = [];

// ------------------------------------------------------------ small stores

function store<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (v: T) => {
      if (Object.is(v, value)) return;
      value = v;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}

const bindingsStore = store<KeyBindings>({ ...DEFAULT_KEYS });
const keyHeld = new Map<string, Btn>(); // physical key -> the button it pressed (released on keyup)

const isTouchDevice = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
const sourceStore = store<InputSource>(isTouchDevice() ? 'touch' : 'keyboard');

/** Use the player's chosen keys from now on. */
export function setBindings(b: KeyBindings) {
  bindingsStore.set({ ...b });
  clearAll();
}

export const getBindings = () => bindingsStore.get();
export const useBindings = () => useSyncExternalStore(bindingsStore.subscribe, bindingsStore.get, bindingsStore.get);

/** Whether the player is using a keyboard, the touch screen or a gamepad. */
export const useInputSource = () => useSyncExternalStore(sourceStore.subscribe, sourceStore.get, sourceStore.get);


// ------------------------------------------------------------ dispatching

function dispatch(e: InputEvt) {
  if (!handlers.length) return;
  let top = handlers[0];
  for (const h of handlers) if (h.layer > top.layer || (h.layer === top.layer && h.seq > top.seq)) top = h;
  top.h(e);
}

function down(btn: Btn) {
  if (!held.has(btn)) {
    held.add(btn);
    if ((DIRS as string[]).includes(btn)) {
      dirOrder = [...dirOrder.filter((d) => d !== btn), btn as DirBtn];
      tapped = btn as DirBtn;
    }
  }
}

function up(btn: Btn) {
  held.delete(btn);
  dirOrder = dirOrder.filter((d) => d !== btn);
}

function interacted() {
  while (firstInteraction.length) firstInteraction.shift()!();
}

/** Run something on the first key press / touch (e.g. to unlock audio). */
export function onFirstInteraction(fn: () => void) {
  firstInteraction.push(fn);
}

// ------------------------------------------------------------ key capture (remapping)

let capture: ((key: string | null) => void) | null = null;

/** The next key pressed is handed to `cb` instead of the game (null = cancelled with Esc / B). */
export function captureNextKey(cb: (key: string | null) => void) {
  capture = cb;
}

export function cancelCapture() {
  const c = capture;
  capture = null;
  c?.(null);
}

// ------------------------------------------------------------ public API

/** Virtual buttons (touch screen / gamepad). */
export function press(btn: Btn, src: InputSource = 'touch') {
  interacted();
  sourceStore.set(src);
  if (capture) {
    if (btn === 'b') cancelCapture();
    return;
  }
  const repeat = held.has(btn);
  down(btn);
  dispatch({ btn, key: btn, char: null, repeat });
}

export function release(btn: Btn) {
  up(btn);
}

export const isHeld = (btn: Btn) => held.has(btn);

/** The most recently pressed direction that is still held. */
export function heldDir(): DirBtn | null {
  return dirOrder.length ? dirOrder[dirOrder.length - 1] : null;
}

/**
 * Direction for this game frame: the held one, or a very short tap that
 * started and ended between two frames (so no key press is ever lost).
 */
export function frameDir(): DirBtn | null {
  const d = heldDir() ?? tapped;
  tapped = null;
  return d;
}

/** Forget pending taps (e.g. when the world is paused). */
export function clearTaps() {
  tapped = null;
}

/** In text mode letters and numbers are typed instead of acting as buttons. */
export function setTextMode(on: boolean) {
  textMode = on;
}

export function pushHandler(h: Handler, layer = 0): () => void {
  const entry = { h, layer, seq: ++seq };
  handlers.push(entry);
  return () => {
    handlers = handlers.filter((x) => x !== entry);
  };
}

/** Listen to input while mounted. Higher layers win (menus over the world). */
export function useInput(handler: Handler, layer = 0, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return pushHandler((e) => ref.current(e), layer);
  }, [active, layer]);
}

// ------------------------------------------------------------ keyboard

function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  interacted();
  sourceStore.set('keyboard');
  if (capture) {
    e.preventDefault();
    if (e.repeat) return;
    if (e.key === 'Escape') cancelCapture();
    else if (!RESERVED_KEYS.includes(e.key)) {
      const c = capture;
      capture = null;
      c(normalizeKey(e.key));
    }
    return;
  }
  let btn: Btn | null = buttonForKey(bindingsStore.get(), e.key, textMode);
  let char: string | null = null;
  if (textMode) {
    if (e.key.length === 1 && /[\p{L}\p{N} ]/u.test(e.key)) {
      char = e.key;
      btn = null;
    } else if (e.key === 'Backspace') {
      btn = null;
    }
  }
  if (!btn && !char && !(textMode && e.key === 'Backspace')) return;
  e.preventDefault();
  if (btn) {
    const wasHeld = held.has(btn);
    keyHeld.set(normalizeKey(e.key), btn);
    down(btn);
    // Only the arrows auto-repeat (handy for long lists).
    if (!(DIRS as string[]).includes(btn) && (e.repeat || wasHeld)) return;
  }
  dispatch({ btn, key: e.key, char, repeat: e.repeat });
}

function onKeyUp(e: KeyboardEvent) {
  const k = normalizeKey(e.key);
  const btn = keyHeld.get(k);
  keyHeld.delete(k);
  if (btn) up(btn);
}

function clearAll() {
  held.clear();
  keyHeld.clear();
  dirOrder = [];
  tapped = null;
}

// Gamepad support (standard mapping): A = button 0, B = button 1, Tipos = Y, Mapa = X, Vozidex = Select,
// Menú = Start, d-pad / left stick.
const padPrev: Record<Btn, boolean> = { up: false, down: false, left: false, right: false, a: false, b: false, menu: false, dex: false, types: false, map: false };
function pollGamepads() {
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = Array.from(pads).find((p) => p && p.connected);
  if (gp) {
    const btn = (i: number) => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    const now: Record<Btn, boolean> = {
      a: btn(0),
      b: btn(1),
      menu: btn(9),
      dex: btn(8),
      types: btn(3),
      map: btn(2),
      up: btn(12) || ay < -0.5,
      down: btn(13) || ay > 0.5,
      left: btn(14) || ax < -0.5,
      right: btn(15) || ax > 0.5,
    };
    for (const k of Object.keys(now) as Btn[]) {
      if (now[k] && !padPrev[k]) press(k, 'pad');
      if (!now[k] && padPrev[k]) release(k);
      padPrev[k] = now[k];
    }
  }
  requestAnimationFrame(pollGamepads);
}

export function startInput() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clearAll);
  window.addEventListener('pointerdown', interacted);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearAll();
  });
  requestAnimationFrame(pollGamepads);
}
