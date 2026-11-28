// How loud the microphone hears things right now (0..1), for the rings around the microphone
// icons: they grow with the voice, so children (and grown-ups) see how loud they have to speak.
// Desktop Chrome / Edge: a second capture of the microphone is measured (echo-cancelled, so the
// game's own music doesn't count). Elsewhere (Safari, phones and tablets, where a second capture
// can disturb the recogniser) the recogniser's own events give coarse steps instead: some sound,
// a voice, words understood.

type Listener = (level: number, speech: boolean) => void;

const listeners = new Set<Listener>();
let level = 0;
let speech = false; // the recogniser says someone is talking
const tell = () => listeners.forEach((l) => l(level, speech));

/** Follow the level (called every frame while it changes); returns the unsubscribe function. */
export function onMicLevel(l: Listener): () => void {
  listeners.add(l);
  l(level, speech);
  return () => void listeners.delete(l);
}

/** 0..1 from the signal's loudness (RMS): about -55 dBFS (a quiet room) up to -15 dBFS (speaking up close). */
export function levelFromRms(rms: number): number {
  const db = 20 * Math.log10(Math.max(rms, 1e-6));
  return Math.min(1, Math.max(0, (db + 55) / 40));
}

/** Where a second capture of the microphone is safe next to the recogniser: desktop Chromium. */
function measurable(): boolean {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
  if (!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)) return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return false; // phones, tablets (iPadOS says "Macintosh")
  return /Chrome\/|Chromium\/|Edg\//.test(ua);
}

let users = 0; // listening sessions going on (reading a name, playing by voice, the mic test)
let gen = 0; // each opening of the microphone (a late one is dropped)
let measuring = false;
let stream: MediaStream | null = null;
let ctx: AudioContext | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let raf = 0;

/** A listening session starts: the level is shown while it lasts. Call the returned function when it ends. */
export function meterMic(): () => void {
  users++;
  if (users === 1) void open();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    users--;
    if (users === 0) close();
  };
}

async function open() {
  if (!measurable()) return;
  const my = ++gen;
  let s: MediaStream;
  try {
    s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
  } catch {
    return; // no permission (yet): the recogniser's events still show something
  }
  if (my !== gen || users === 0) {
    s.getTracks().forEach((t) => t.stop());
    return;
  }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    const c = ctx;
    stream = s;
    source = c.createMediaStreamSource(s);
    const analyser = c.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    measuring = true;
    let frame = 0;
    const loop = () => {
      if (c.state === 'suspended' && frame++ % 30 === 0) void c.resume(); // browsers start it only after a gesture
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const target = levelFromRms(Math.sqrt(sum / buf.length));
      level += (target - level) * (target > level ? 0.5 : 0.15); // quick to rise, slower to fall: easier to see
      tell();
      raf = requestAnimationFrame(loop);
    };
    void c.resume();
    raf = requestAnimationFrame(loop);
  } catch {
    s.getTracks().forEach((t) => t.stop());
    close();
  }
}

function close() {
  gen++;
  cancelAnimationFrame(raf);
  cancelAnimationFrame(stepRaf);
  measuring = false;
  source?.disconnect();
  source = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  void ctx?.suspend().catch(() => {});
  level = 0;
  speech = false;
  base = 0;
  tell();
}

// ------------------------------------------------------------------ without a measurement: steps

let base = 0;
let stepRaf = 0;

function glide() {
  cancelAnimationFrame(stepRaf);
  const step = () => {
    level += (base - level) * 0.12;
    if (Math.abs(level - base) < 0.01) level = base;
    tell();
    if (level !== base) stepRaf = requestAnimationFrame(step);
  };
  stepRaf = requestAnimationFrame(step);
}

/**
 * What the recogniser noticed: 'sound', 'speech' (someone talks), 'words' (it understood some) or
 * 'quiet'. Marks that someone is talking, and gives the level steps where it can't be measured.
 */
export function micNoticed(what: 'sound' | 'speech' | 'words' | 'quiet') {
  if (what === 'speech' || what === 'words') speech = true;
  else if (what === 'quiet') speech = false;
  if (measuring || users === 0) {
    tell();
    return;
  }
  base = what === 'quiet' ? 0 : what === 'sound' ? 0.3 : 0.6;
  if (what === 'words') level = 1; // a burst, then back down to the voice's step
  glide();
}
