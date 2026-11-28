// Listening to a child reading an Vozimón's name (browser speech recognition, Web Speech API; the
// shared plumbing is in recognizer.ts). Where nothing can listen (Firefox), a grown-up confirms.
// Also the setup check for grown-ups (is everything ready for listening?) and its microphone test.

import { heardName } from '../game/reading';
import { getSpecies } from '../game/creatures';
import { setListening } from './audio';
import { meterMic, micNoticed } from './micLevel';
import {
  LANGS,
  claimMic,
  findLocalLang,
  getLocalLang,
  lastListenError,
  noteFailed,
  noteWorked,
  recognizer,
  setLocalLang,
  type PhraseCtor,
  type Rec,
} from './recognizer';

export { canListen } from './recognizer';

/** 'ok' read right · 'wrong' heard something else · 'silence' heard nothing · 'denied' no microphone permission · 'unavailable' can't listen. */
export type ListenResult = 'ok' | 'wrong' | 'silence' | 'denied' | 'unavailable';

const LISTEN_MS = 9000; // at most this long: a child may need a moment to start
const PAUSE_MS = 2200; // ...and stops listening this long after the child stopped talking

/** What the recogniser heard the last time (shown with ?debug, and logged to the console). */
let lastHeard: string[] = [];
export const heardLastTime = () => lastHeard;

let packTried = false;

/** Where Chrome offers it, download its Spanish pack so voices can stay on the device (once per visit, unless `again`). */
async function installPack(again = false): Promise<void> {
  const R = recognizer();
  if ((packTried && !again) || getLocalLang() || !R?.available || !R.install) return;
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
 * Called when a grown-up switches reading aloud or playing by voice on in Ajustes (a tap, so the browser allows it):
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
  const release = claimMic(); // playing by voice waits while the child reads
  const stopMeter = meterMic(); // the rings around the microphone show how loud it hears the child

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
    stopMeter();
    release();
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
    r.onsoundstart = () => rec === r && micNoticed('sound');
    r.onspeechstart = () => rec === r && micNoticed('speech');
    r.onspeechend = () => rec === r && micNoticed('quiet');
    r.onresult = (e) => {
      if (rec !== r) return;
      noteWorked();
      micNoticed('words');
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
      if (err === 'no-speech') {
        noteWorked();
        return finish('silence');
      }
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        noteFailed(err);
        return finish('denied');
      }
      if (err === 'phrases-not-supported' && phrases) return restart(() => attempt(lang, local, false));
      if (err === 'language-not-supported' || err === 'language-not-available') {
        const next = LANGS[LANGS.indexOf(lang) + 1];
        if (next) return restart(() => attempt(next, false, phrases));
      }
      if (local && err !== 'audio-capture') return restart(() => attempt(LANGS[0], false, false)); // try the browser's service
      noteFailed(err);
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
  const local = getLocalLang();
  attempt(local ?? LANGS[0], !!local, true);
  timer = window.setTimeout(stopListening, LISTEN_MS);

  return { result, stop: () => finish('silence') };
}

// ------------------------------------------------------------------ setup check
// So a grown-up finds out before playing (not when a child is waiting to read a name) whether
// listening will work here: shown on the title screen and in Ajustes → Micrófono.

/** granted · prompt (not asked yet) · denied (blocked) · none (no microphone) · unknown (the browser doesn't say). */
export type MicState = 'granted' | 'prompt' | 'denied' | 'none' | 'unknown';
/** local: Spanish on the device · downloadable / downloading: the pack can be fetched · service: the browser's server · unknown */
export type PackState = 'local' | 'downloadable' | 'downloading' | 'service' | 'unknown';

export interface ListenCheck {
  browser: boolean; // has speech recognition at all
  secure: boolean; // https or localhost (otherwise there is no microphone)
  mic: MicState;
  pack: PackState;
  online: boolean;
  lastError: string | null;
}

/** ok: ready · setup: a grown-up can fix something · none: this browser can't listen. */
export type ListenStatus = 'ok' | 'setup' | 'none';

export function listenStatus(c: ListenCheck): ListenStatus {
  if (!c.browser || !c.secure) return 'none';
  if (c.mic !== 'granted' && c.mic !== 'unknown') return 'setup';
  if (c.pack === 'downloadable' || c.pack === 'downloading') return 'setup';
  if (c.pack !== 'local' && !c.online) return 'setup';
  if (c.lastError) return 'setup';
  return 'ok';
}

async function micState(): Promise<MicState> {
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  if (!md?.getUserMedia) return 'none';
  let perm: PermissionState | null = null;
  try {
    perm =
      (
        await navigator.permissions?.query({
          name: 'microphone' as PermissionName,
        })
      )?.state ?? null;
  } catch {
    // Firefox and older Safari can't be asked
  }
  if (perm === 'denied') return 'denied';
  let inputs: MediaDeviceInfo[] | null = null;
  try {
    inputs = (await md.enumerateDevices()).filter((d) => d.kind === 'audioinput');
  } catch {
    // can't list devices
  }
  if (perm === 'granted') return inputs && !inputs.length ? 'none' : 'granted';
  if (perm === 'prompt') return 'prompt';
  if (inputs?.some((d) => d.label)) return 'granted'; // labels only show once the microphone is allowed
  return 'unknown';
}

async function packState(): Promise<PackState> {
  const R = recognizer();
  if (!R?.available) return 'unknown';
  let best: PackState = 'service';
  for (const lang of LANGS) {
    try {
      const a = await R.available({ langs: [lang], processLocally: true });
      if (a === 'available') {
        setLocalLang(lang);
        return 'local';
      }
      if (a === 'downloading') best = 'downloading';
      else if (a === 'downloadable' && best === 'service') best = 'downloadable';
    } catch {
      return 'unknown';
    }
  }
  return best;
}

/** Look (without asking anything or switching the microphone on) whether listening can work here. */
export async function checkListening(): Promise<ListenCheck> {
  const browser = !!recognizer();
  const secure = typeof window === 'undefined' || window.isSecureContext !== false;
  const [mic, pack] = browser ? await Promise.all([micState(), packState()]) : (['unknown', 'unknown'] as const);
  return {
    browser,
    secure,
    mic,
    pack,
    online: typeof navigator === 'undefined' || navigator.onLine !== false,
    lastError: lastListenError(),
  };
}

/** Ask for the microphone (needs a tap or key press). */
export async function askMicrophone(): Promise<boolean> {
  try {
    const s = await navigator.mediaDevices?.getUserMedia({ audio: true });
    s?.getTracks().forEach((t) => t.stop());
    return !!s;
  } catch {
    return false;
  }
}

/** Download the Spanish pack for on-device listening (Chrome; needs a tap or key press). */
export const installVoicePack = () => installPack(true);

/** A grown-up tries it out: listen once for anything and report what was heard. */
export function probeListening(): {
  result: Promise<{ heard: string; error: string | null }>;
  stop: () => void;
} {
  const R = recognizer();
  if (!R)
    return {
      result: Promise.resolve({ heard: '', error: 'unavailable' }),
      stop: () => {},
    };
  let done = false;
  let resolve!: (v: { heard: string; error: string | null }) => void;
  const result = new Promise<{ heard: string; error: string | null }>((r) => (resolve = r));
  let heard = '';
  let r: Rec | null = null;
  let timer = 0;
  const release = claimMic(); // playing by voice waits during the test
  const stopMeter = meterMic(); // ...and the level bar shows how loud it hears
  const finish = (error: string | null) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    try {
      r?.abort();
    } catch {
      // already stopped
    }
    setListening(false);
    stopMeter();
    release();
    console.info(`[Vozimón] Prueba del micrófono: ${error ?? 'ok'} · oído: «${heard}»`);
    resolve({ heard, error });
  };
  const start = (local: boolean) => {
    const rec = new R();
    r = rec;
    rec.lang = (local && getLocalLang()) || LANGS[0];
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    try {
      if (local && 'processLocally' in rec) rec.processLocally = true;
    } catch {
      // older browsers
    }
    rec.onsoundstart = () => r === rec && micNoticed('sound');
    rec.onspeechstart = () => r === rec && micNoticed('speech');
    rec.onspeechend = () => r === rec && micNoticed('quiet');
    rec.onresult = (e) => {
      if (r !== rec) return;
      noteWorked();
      micNoticed('words');
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) if (e.results[i][0]?.transcript) parts.push(e.results[i][0].transcript.trim());
      heard = parts.join(' ');
    };
    rec.onerror = (e) => {
      if (r !== rec || e.error === 'aborted') return;
      if (e.error === 'no-speech') {
        noteWorked();
        return finish('no-speech');
      }
      if (local && e.error !== 'audio-capture' && e.error !== 'not-allowed') {
        r = null;
        try {
          rec.abort();
        } catch {
          // already stopped
        }
        return start(false); // try the browser's service
      }
      noteFailed(e.error);
      finish(e.error);
    };
    rec.onend = () => r === rec && finish(heard ? null : 'no-speech');
    try {
      rec.start();
    } catch {
      finish('unavailable');
    }
  };
  setListening(true);
  start(!!getLocalLang());
  timer = window.setTimeout(() => finish(heard ? null : 'no-speech'), 8000);
  return { result, stop: () => finish('aborted') };
}
