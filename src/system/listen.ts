// Listening to a child reading an Vozimón's name (browser speech recognition, Web Speech API).
// Chrome / Edge: on the device when its Spanish pack is installed, otherwise Google's / Microsoft's
// servers. Safari: Apple's service. Firefox has none: then only a grown-up can confirm.
// Only used when a grown-up switched "Leer en voz alta" on in Ajustes.

import { heardName } from '../game/reading';
import { getSpecies } from '../game/creatures';
import { setListening } from './audio';

/** 'ok' read right · 'wrong' heard something else · 'silence' heard nothing · 'denied' no microphone permission · 'unavailable' can't listen. */
export type ListenResult = 'ok' | 'wrong' | 'silence' | 'denied' | 'unavailable';

interface Alternative {
  transcript: string;
}
interface RecEvent {
  results: ArrayLike<ArrayLike<Alternative>>;
}
interface Rec {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  processLocally?: boolean;
  phrases?: unknown;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface LangQuery {
  langs: string[];
  processLocally: boolean;
}
interface RecCtor {
  new (): Rec;
  available?(o: LangQuery): Promise<string>;
  install?(o: LangQuery): Promise<boolean>;
}
type PhraseCtor = new (phrase: string, boost?: number) => unknown;

/** Chilean Spanish first; other Spanish variants where that one isn't offered. */
const LANGS = ['es-CL', 'es-US', 'es-ES'];
const LISTEN_MS = 9000; // at most this long: a child may need a moment to start
const PAUSE_MS = 2200; // ...and stops listening this long after the child stopped talking

/** What the recogniser heard the last time (shown with ?debug, and logged to the console). */
let lastHeard: string[] = [];
export const heardLastTime = () => lastHeard;

const recognizer = (): RecCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Can this browser listen at all? (If not, a grown-up confirms the reading instead.) */
export const canListen = () => !!recognizer();

/** The Spanish language that works on this device without any server, once known. */
let localLang: string | null = null;

async function findLocalLang(): Promise<void> {
  const R = recognizer();
  if (!R?.available) return;
  for (const lang of LANGS) {
    try {
      if ((await R.available({ langs: [lang], processLocally: true })) === 'available') {
        localLang = lang;
        return;
      }
    } catch {
      return;
    }
  }
}
void findLocalLang();

let packTried = false;

/** Where Chrome offers it, download its Spanish pack so voices can stay on the device (once per visit). */
async function installPack(): Promise<void> {
  const R = recognizer();
  if (packTried || localLang || !R?.available || !R.install) return;
  packTried = true;
  try {
    for (const lang of LANGS) {
      const a = await R.available({ langs: [lang], processLocally: true });
      if (a === 'available') break;
      if (a === 'downloadable' || a === 'downloading') {
        await R.install({ langs: [lang], processLocally: true });
        break;
      }
    }
  } catch {
    // no on-device recognition: the browser's service is used
  }
  await findLocalLang();
}

/**
 * Called when a grown-up switches reading aloud on in Ajustes (a tap, so the browser allows it):
 * asks for the microphone now, while the grown-up is there, and fetches the on-device pack.
 */
export async function prepareListening(): Promise<void> {
  const mic = (async () => {
    try {
      const s = await navigator.mediaDevices?.getUserMedia({ audio: true });
      s?.getTracks().forEach((t) => t.stop());
    } catch {
      // denied or no microphone: the game falls back to a grown-up's ✓
    }
  })();
  await Promise.all([mic, installPack()]);
}

/**
 * Listen for the child reading creature `id`'s name. Resolves as soon as the name is heard, or
 * when the child stops talking / after a few seconds. `misses` are the tries that weren't understood
 * before (each makes the check a little easier). `stop()` gives up (the result is then ignored).
 */
export function listenFor(id: number, misses: number, onHearing?: () => void): { result: Promise<ListenResult>; stop: () => void } {
  const R = recognizer();
  if (!R) return { result: Promise.resolve('unavailable'), stop: () => {} };
  const name = getSpecies(id).name;
  const heardSet = new Set<string>();
  let rec: Rec | null = null;
  let finished = false;
  let resolve!: (r: ListenResult) => void;
  const result = new Promise<ListenResult>((r) => (resolve = r));
  let timer = 0;
  let pause = 0;
  const heard = () => [...heardSet];
  const verdict = (): ListenResult => (heardName(heard(), id, misses) ? 'ok' : heardSet.size ? 'wrong' : 'silence');

  const finish = (r: ListenResult) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    clearTimeout(pause);
    lastHeard = heard();
    console.info(`[Vozimón] Leer «${name}»: ${r} · oído: ${lastHeard.map((t) => `«${t}»`).join(', ') || '(nada)'}`);
    const old = rec;
    rec = null;
    try {
      old?.abort();
    } catch {
      // already stopped
    }
    setListening(false);
    resolve(r);
  };

  const attempt = (lang: string, local: boolean, phrases: boolean) => {
    const r = new R();
    rec = r;
    r.lang = lang;
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.continuous = true; // children read syllable by syllable: don't stop at the first pause
    try {
      if (local && 'processLocally' in r) r.processLocally = true;
      const Phrase = (window as unknown as { SpeechRecognitionPhrase?: PhraseCtor }).SpeechRecognitionPhrase;
      // tell the recogniser which (invented) word to expect, where it can take a hint
      if (local && phrases && Phrase && 'phrases' in r) r.phrases = [new Phrase(name, 3)];
    } catch {
      // older browsers: plain recognition
    }
    r.onaudiostart = () => rec === r && onHearing?.();
    r.onresult = (e) => {
      if (rec !== r) return;
      const best: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        for (let j = 0; j < res.length; j++) if (res[j]?.transcript) heardSet.add(res[j].transcript.trim());
        if (res[0]?.transcript) best.push(res[0].transcript.trim());
      }
      if (best.length > 1) heardSet.add(best.join(' ')); // "Tri" + "nín" said with a pause
      if (heardName(heard(), id, misses)) return finish('ok');
      // still talking? wait for a pause, then check what was said
      clearTimeout(pause);
      pause = window.setTimeout(stopListening, PAUSE_MS);
    };
    r.onerror = (e) => {
      if (rec !== r) return;
      const err = e.error;
      if (err === 'aborted') return;
      console.info(`[Vozimón] Leer: error del reconocimiento de voz (${lang}${local ? ', en el aparato' : ''}): ${err}`);
      if (err === 'no-speech') return finish('silence');
      if (err === 'not-allowed' || err === 'service-not-allowed') return finish('denied');
      if (err === 'phrases-not-supported' && phrases) return restart(() => attempt(lang, local, false));
      if (err === 'language-not-supported' || err === 'language-not-available') {
        const next = LANGS[LANGS.indexOf(lang) + 1];
        if (next) return restart(() => attempt(next, false, phrases));
      }
      if (local && err !== 'audio-capture') return restart(() => attempt(LANGS[0], false, false)); // try the browser's service
      finish('unavailable');
    };
    r.onend = () => {
      if (rec !== r) return;
      finish(verdict());
    };
    try {
      r.start();
    } catch {
      finish('unavailable');
    }
  };

  /** Drop the current recogniser (its late events are ignored) and start another one. */
  const restart = (next: () => void) => {
    const old = rec;
    rec = null;
    try {
      old?.abort();
    } catch {
      // already stopped
    }
    next();
  };

  /** Stop the microphone: the last words arrive, then onend checks them (or we do, if it never ends). */
  function stopListening() {
    clearTimeout(timer);
    clearTimeout(pause);
    try {
      rec?.stop();
    } catch {
      // already stopped
    }
    timer = window.setTimeout(() => finish(verdict()), 1500);
  }

  setListening(true);
  void installPack(); // reading aloud is on by default: the first reading starts the download
  attempt(localLang ?? LANGS[0], !!localLang, true);
  timer = window.setTimeout(stopListening, LISTEN_MS);

  return { result, stop: () => finish('silence') };
}
