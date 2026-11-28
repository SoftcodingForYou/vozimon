// Playing by voice ("Jugar con la voz", off until a grown-up switches it on in Ajustes). While a game
// is open, one recogniser listens all the time for the words of the screen on top («mapa»,
// «atacar», «cerrar»...) or a Vozimón's name. Screens say what they understand with useVoice(),
// layered like useInput(): only the top one is asked. The music keeps playing; reading a name out
// loud (which mutes it) or the grown-up's microphone test take the microphone over for a moment.

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { WORD_MATCH, bestName, wordScore } from '../game/reading';
import { getSpecies } from '../game/creatures';
import { LANGS, getLocalLang, micClaimed, noteFailed, noteWorked, onMicClaims, recognizer, type Rec, type RecEvent } from './recognizer';
import { meterMic, micNoticed } from './micLevel';

/** The words each command answers to (sound-alike forms count too, see wordScore). */
export const SAY = {
  atacar: ['atacar', 'ataca', 'ataque', 'luchar', 'lucha', 'pelear'],
  cambiar: ['cambiar', 'cambia'],
  huir: ['huir', 'huye', 'escapar', 'escapa', 'arrancar', 'arranca', 'correr', 'corre'],
  lanzar: ['lanzar', 'lanza', 'bola', 'tirar'],
  mapa: ['mapa'],
  vozidex: ['vozidex'],
  tipos: ['tipos', 'tipo'],
  cerrar: ['cerrar', 'cierra', 'cancelar', 'cancela'],
  volver: ['volver', 'vuelve'],
  leer: ['leer', 'lee'],
} as const;

/** Every word that closes a screen: «cerrar», «cancelar», «volver». */
export const CLOSE_WORDS: readonly string[] = [...SAY.cerrar, ...SAY.volver];

export interface VoiceCmd {
  words: readonly string[];
  run: () => void;
  show?: string; // what the "heard" bubble shows (default: the word that was said, as written here)
}

export interface VoiceSpec {
  cmds?: VoiceCmd[];
  names?: { ids: number[]; run: (id: number) => void }; // Vozimón that can be called by name
}

/**
 * off: not playing by voice · listening / hearing: the microphone is open (someone is talking) ·
 * paused: a reading has the microphone · unavailable: this browser can't listen ·
 * denied: no permission · error: the microphone or the browser's service failed (trying again).
 */
export type VoiceState = 'off' | 'listening' | 'hearing' | 'paused' | 'unavailable' | 'denied' | 'error';

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

const stateStore = store<VoiceState>('off');
const heardStore = store<{ text: string; n: number } | null>(null);

let enabled = false; // Ajustes → Jugar con la voz
let sessions = 0; // open game screens (useVoiceSession)
let rec: Rec | null = null;
let consumed = 0; // results of the current recognition already used (each one acts once)
let restartTimer = 0;
let failures = 0; // in a row: wait longer before trying again
let blocked = false; // no permission / no microphone: wait for a tap or a key
let gestureTries = 0;
let useLocal = true; // false once on-device recognition failed: then the browser's service
let langIdx = 0;
let heardCount = 0;

type Entry = { spec: () => VoiceSpec | null; layer: number; seq: number };
let handlers: Entry[] = [];
let seq = 0;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const hidden = () => typeof document !== 'undefined' && document.hidden;
const wanted = () => enabled && sessions > 0;

let meterStop: (() => void) | null = null;

/** The level meter runs while the listener does (or is about to start again). */
function syncMeter() {
  const on = !!rec || !!restartTimer;
  if (on && !meterStop) meterStop = meterMic();
  else if (!on && meterStop) {
    meterStop();
    meterStop = null;
  }
}

function update() {
  updateListener();
  syncMeter();
}

function updateListener() {
  if (!wanted()) {
    stop();
    stateStore.set('off');
  } else if (!recognizer()) {
    stateStore.set('unavailable');
  } else if (micClaimed() || hidden()) {
    stop();
    stateStore.set('paused');
  } else if (blocked) {
    stop();
  } else if (!rec && !restartTimer) {
    start();
  }
}

function stop() {
  clearTimeout(restartTimer);
  restartTimer = 0;
  const r = rec;
  rec = null;
  try {
    r?.abort();
  } catch {
    // already stopped
  }
}

function start() {
  const R = recognizer();
  if (!R) return;
  const local = useLocal ? getLocalLang() : null;
  const r = new R();
  rec = r;
  consumed = 0;
  const startedAt = performance.now();
  let failedNow = false;
  r.lang = local ?? LANGS[langIdx] ?? LANGS[0];
  r.continuous = true;
  r.interimResults = true; // act as soon as a word is clear
  r.maxAlternatives = 5;
  try {
    if (local && 'processLocally' in r) r.processLocally = true;
  } catch {
    // older browsers: plain recognition
  }
  r.onaudiostart = () => rec === r && stateStore.set('listening');
  r.onsoundstart = () => rec === r && micNoticed('sound');
  r.onspeechstart = () => {
    if (rec !== r) return;
    stateStore.set('hearing');
    micNoticed('speech');
  };
  r.onspeechend = () => {
    if (rec !== r) return;
    stateStore.set('listening');
    micNoticed('quiet');
  };
  r.onresult = (e) => rec === r && results(e);
  r.onerror = (e) => {
    if (rec !== r) return;
    failedNow = e.error !== 'aborted' && e.error !== 'no-speech';
    failed(e.error, !!local);
  };
  r.onend = () => {
    if (rec !== r) return;
    rec = null;
    if (stateStore.get() === 'hearing') stateStore.set('listening');
    // a recogniser that keeps ending right away mustn't be restarted in a tight loop
    if (!failedNow && performance.now() - startedAt < 1000) failures++;
    restartSoon();
  };
  try {
    r.start();
    if (stateStore.get() !== 'error') stateStore.set('listening');
  } catch {
    rec = null;
    failures++;
    restartSoon();
  }
}

/** Browsers end a recognition after a silence or a while: start the next one (later after failures). */
function restartSoon() {
  clearTimeout(restartTimer);
  restartTimer = 0;
  if (!wanted() || blocked || micClaimed() || hidden() || !recognizer()) return update();
  const delay = failures ? Math.min(15000, 1000 * 2 ** (failures - 1)) : 250;
  restartTimer = window.setTimeout(() => {
    restartTimer = 0;
    update();
  }, delay);
  syncMeter();
}

function failed(err: string, local: boolean) {
  if (err === 'aborted' || err === 'no-speech') return; // silence: it ends and starts again
  console.info(`[Vozimón] Voz: error del reconocimiento de voz (${err}${local ? ', en el aparato' : ''})`);
  if (err === 'language-not-supported' || err === 'language-not-available') {
    if (local) useLocal = false;
    else if (langIdx < LANGS.length - 1) langIdx++;
    return;
  }
  if (local && err !== 'audio-capture' && err !== 'not-allowed') {
    useLocal = false; // try the browser's service next time
    return;
  }
  noteFailed(err); // the setup check for grown-ups shows it
  failures++;
  if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
    blocked = true;
    stateStore.set(err === 'audio-capture' ? 'error' : 'denied');
  } else {
    stateStore.set('error'); // e.g. no internet for the browser's service: try again later
  }
}

function results(e: RecEvent) {
  failures = 0;
  noteWorked();
  micNoticed('words');
  if (stateStore.get() === 'error') stateStore.set('listening');
  const from = Math.max(e.resultIndex ?? 0, consumed);
  for (let i = from; i < e.results.length; i++) {
    const res = e.results[i];
    const alts: string[] = [];
    for (let j = 0; j < res.length; j++) if (res[j]?.transcript?.trim()) alts.push(res[j].transcript.trim());
    if (alts.length && heard(alts, !!res.isFinal)) {
      consumed = i + 1; // this one is done, even when the recogniser still corrects it
      return;
    }
    if (res.isFinal && i === consumed) consumed = i + 1;
  }
}

function topHandler(): Entry | null {
  let top: Entry | null = null;
  for (const h of handlers) if (!top || h.layer > top.layer || (h.layer === top.layer && h.seq > top.seq)) top = h;
  return top;
}

function match(spec: VoiceSpec, alts: string[]): { text: string; run: () => void } | null {
  let best: { cmd: VoiceCmd; word: string } | null = null;
  let bestScore = 0;
  for (const cmd of spec.cmds ?? []) {
    for (const word of cmd.words) {
      const s = wordScore(alts, [word]);
      if (s > bestScore) {
        bestScore = s;
        best = { cmd, word };
      }
    }
  }
  if (best && bestScore >= WORD_MATCH) return { text: best.cmd.show ?? capitalize(best.word), run: best.cmd.run };
  const names = spec.names;
  if (names?.ids.length) {
    const id = bestName(alts, names.ids);
    if (id !== null) return { text: getSpecies(id).name, run: () => names.run(id) };
  }
  return null;
}

/** Does the screen on top understand what was heard? Then it acts (and the bubble shows the word). */
function heard(alts: string[], final: boolean): boolean {
  const spec = topHandler()?.spec() ?? null;
  const hit = spec ? match(spec, alts) : null;
  if (hit || final) console.info(`[Vozimón] Voz: ${alts.map((t) => `«${t}»`).join(', ')}${hit ? ` → ${hit.text}` : ''}`);
  if (!hit) return false;
  heardStore.set({ text: hit.text, n: ++heardCount });
  hit.run();
  return true;
}

if (typeof window !== 'undefined') {
  onMicClaims(update);
  document.addEventListener('visibilitychange', update);
  // Without permission (or when Safari wants a gesture to start), a tap or key tries again a few times.
  const retry = () => {
    if (!blocked || !wanted() || gestureTries >= 3) return;
    gestureTries++;
    blocked = false;
    update();
  };
  window.addEventListener('pointerdown', retry, true);
  window.addEventListener('keydown', retry, true);
}

// ------------------------------------------------------------------ public API

/** Ajustes → Jugar con la voz. */
export function setVoiceEnabled(on: boolean) {
  if (on === enabled) return;
  enabled = on;
  retryVoice();
}

/** Try to listen again (e.g. after the grown-up allowed the microphone). */
export function retryVoice() {
  blocked = false;
  failures = 0;
  gestureTries = 0;
  useLocal = true;
  update();
}

/** While mounted (the game screen), playing by voice listens, if it's switched on. */
export function useVoiceSession(active = true) {
  useEffect(() => {
    if (!active) return;
    sessions++;
    update();
    return () => {
      sessions--;
      update();
    };
  }, [active]);
}

/** What this screen understands while mounted and active. Higher layers win (like useInput). */
export function useVoice(spec: VoiceSpec | null, layer: number, active = true) {
  const ref = useRef(spec);
  ref.current = spec;
  useEffect(() => {
    if (!active) return;
    const entry: Entry = { spec: () => ref.current, layer, seq: ++seq };
    handlers.push(entry);
    return () => {
      handlers = handlers.filter((x) => x !== entry);
    };
  }, [active, layer]);
}

export const useVoiceState = () => useSyncExternalStore(stateStore.subscribe, stateStore.get, stateStore.get);

/** The last word (or name) that was understood, for the bubble. */
export const useVoiceHeard = () => useSyncExternalStore(heardStore.subscribe, heardStore.get, heardStore.get);

/** Test hook (?debug, window.__vozi.say): act as if `text` had just been heard. */
export function simulateHeard(text: string): boolean {
  if (!enabled) return false;
  return heard([text], true);
}
