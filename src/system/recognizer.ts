// The browser's speech recognition (Web Speech API), shared by reading names out loud (listen.ts)
// and playing by voice (voice.ts): which recogniser there is, which Spanish to ask for (on the
// device when Chrome has its Spanish pack), what failed last time, and who has the microphone now.
// Chrome / Edge: on the device when the pack is installed, otherwise Google's / Microsoft's servers.
// Safari: Apple's service. Firefox has none.

export interface Alternative {
  transcript: string;
}
export interface RecResult extends ArrayLike<Alternative> {
  isFinal?: boolean;
}
export interface RecEvent {
  resultIndex?: number;
  results: ArrayLike<RecResult>;
}
export interface Rec {
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
  onsoundstart?: (() => void) | null;
  onsoundend?: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
export interface LangQuery {
  langs: string[];
  processLocally: boolean;
}
export interface RecCtor {
  new (): Rec;
  available?(o: LangQuery): Promise<string>;
  install?(o: LangQuery): Promise<boolean>;
}
export type PhraseCtor = new (phrase: string, boost?: number) => unknown;

/** Chilean Spanish first; other Spanish variants where that one isn't offered. */
export const LANGS = ['es-CL', 'es-US', 'es-ES'];

export const recognizer = (): RecCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Can this browser listen at all? (If not, a grown-up confirms the reading instead.) */
export const canListen = () => !!recognizer();

// ------------------------------------------------------------------ on-device Spanish

/** The Spanish language that works on this device without any server, once known. */
let localLang: string | null = null;
export const getLocalLang = () => localLang;
/** Found out elsewhere (e.g. by the setup check) that this language works on the device. */
export function setLocalLang(lang: string) {
  localLang ??= lang;
}

export async function findLocalLang(): Promise<void> {
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

// ------------------------------------------------------------------ what failed last time

const FAIL_KEY = 'vozimon.voz.v1';

/** The last time listening failed on this device (kept until it works again), e.g. 'network'. */
export function lastListenError(): string | null {
  try {
    return localStorage.getItem(FAIL_KEY);
  } catch {
    return null;
  }
}
export function noteFailed(err: string) {
  try {
    localStorage.setItem(FAIL_KEY, err);
  } catch {
    // no storage: the check just won't remember it
  }
}
export function noteWorked() {
  try {
    localStorage.removeItem(FAIL_KEY);
  } catch {
    // no storage
  }
}

// ------------------------------------------------------------------ who has the microphone

let claims = 0;
const claimListeners = new Set<() => void>();
const tellClaims = () => claimListeners.forEach((l) => l());

/**
 * Reading a name out loud or the grown-up's microphone test take the microphone for themselves:
 * playing by voice steps aside meanwhile (browsers run one recogniser at a time). Call the returned
 * function when done. Claim before starting your own recogniser (the voice listener stops right away).
 */
export function claimMic(): () => void {
  claims++;
  tellClaims();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims--;
    tellClaims();
  };
}

export const micClaimed = () => claims > 0;

export function onMicClaims(l: () => void): () => void {
  claimListeners.add(l);
  return () => void claimListeners.delete(l);
}
