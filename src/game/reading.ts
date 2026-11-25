// Reading names out loud: does what the speech recogniser heard sound like the creature's name?
// And the name split into syllables (Chis·pín), to help when it didn't work yet.

import { SPECIES } from './creatures';

/** How alike two names must sound (0..1) to count as read. */
export const READ_MATCH = 0.7;

/**
 * How a word sounds in (Latin American) Spanish, as a plain key: accents and silent letters go,
 * letters that sound the same become one (v/b, z/s/ce, ll/y, qu/k/c...). Recognisers write
 * invented names in many ways ("chispin", "Chispín", "chis pin"); the key stays the same.
 */
export function soundKey(s: string): string {
  let t = s.toLowerCase().replace(/ü/g, 'w').replace(/ñ/g, 'N');
  t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/[^a-zwN]/g, '');
  t = t
    .replace(/ch/g, 'X')
    .replace(/ll/g, 'y')
    .replace(/qu(?=[ei])/g, 'k')
    .replace(/gu(?=[ei])/g, 'G')
    .replace(/g(?=[ei])/g, 'j')
    .replace(/G/g, 'g')
    .replace(/c(?=[ei])/g, 's')
    .replace(/[cq]/g, 'k')
    .replace(/z/g, 's')
    .replace(/v/g, 'b')
    .replace(/h/g, '')
    .replace(/x/g, 'ks')
    .replace(/w/g, 'u')
    .replace(/y(?![aeiou])/g, 'i');
  return t.replace(/(.)\1+/g, '$1');
}

/** Sounds that children (and recognisers) easily mix up: swapping them costs only half. */
const NEAR = new Set(['ei', 'ou', 'rl', 'nm', 'dt', 'bp', 'kg', 'nN', 'yi'].flatMap((p) => [p, p[1] + p[0]]));
const subCost = (a: string, b: string) => (a === b ? 0 : NEAR.has(a + b) ? 0.5 : 1);

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + subCost(a[i - 1], b[j - 1]));
    prev = cur;
  }
  return prev[b.length];
}

/** 1 = sounds the same, 0 = nothing alike. */
export function soundsAlike(a: string, b: string): number {
  const ka = soundKey(a);
  const kb = soundKey(b);
  if (!ka || !kb) return 0;
  return 1 - levenshtein(ka, kb) / Math.max(ka.length, kb.length);
}

let rosterKeys: { id: number; key: string }[] | null = null;
const keys = () => (rosterKeys ??= SPECIES.map((s) => ({ id: s.id, key: soundKey(s.name) })));

function likeness(key: string, other: string) {
  return key && other ? 1 - levenshtein(key, other) / Math.max(key.length, other.length) : 0;
}

/** The pieces of a transcript that might be the name: single words, 2–3 words run together, all of it. */
function pieces(transcript: string): string[] {
  const words = transcript.split(/[\s,.;:!¡?¿"«»()-]+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= 3 && i + n <= words.length; n++) out.add(words.slice(i, i + n).join(''));
  }
  out.add(words.join(''));
  return [...out];
}

/**
 * Did the child read this creature's name? `heard` are the recogniser's guesses. A guess counts
 * when it sounds enough like the name and not more like any other Vozimón's name (so "Lanita"
 * doesn't count for Ranita, but "ranitas" or "Anita" do). Recognisers like to finish invented
 * names as real words ("Trinín" → "Trinidad"), so a longer word is also compared by its start.
 */
export function heardName(heard: string[], id: number): boolean {
  const all = keys();
  const target = all.find((k) => k.id === id);
  if (!target) return false;
  for (const t of heard) {
    for (const p of pieces(t)) {
      const k = soundKey(p);
      const start = k.length > target.key.length ? k.slice(0, target.key.length) : k;
      const s = Math.max(likeness(k, target.key), likeness(start, target.key));
      if (s < READ_MATCH) continue;
      if (all.every((o) => o.id === id || (likeness(k, o.key) <= s && likeness(start, o.key) <= s))) return true;
    }
  }
  return false;
}

// ---- syllables ----

const STRONG = 'aeoáéó';
const ACCENTED_WEAK = 'íú';
const WEAK = 'iuü';
const isVowelChar = (c: string) => STRONG.includes(c) || ACCENTED_WEAK.includes(c) || WEAK.includes(c);
/** Two consonants that start a syllable together (bra, cla, tre...). */
const CLUSTERS = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tr']);

interface Unit {
  from: number;
  to: number;
  vowel: boolean;
  c: string; // the sound unit in lower case (consonants: 'ch', 'll', 'rr', 'qu', 'gu' or a letter)
}

function units(name: string): Unit[] {
  const s = name.toLowerCase();
  const out: Unit[] = [];
  let i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    const next = s[i + 2] ?? '';
    if (two === 'ch' || two === 'll' || two === 'rr') {
      out.push({ from: i, to: i + 2, vowel: false, c: two });
      i += 2;
    } else if ((two === 'qu' || two === 'gu') && 'eiéí'.includes(next) && next) {
      out.push({ from: i, to: i + 2, vowel: false, c: two }); // the u is silent (que, gui)
      i += 2;
    } else if (s[i] === 'y') {
      const v = !isVowelChar(s[i + 1] ?? ''); // "y" before a vowel is a consonant
      out.push({ from: i, to: i + 1, vowel: v, c: v ? 'i' : 'y' });
      i += 1;
    } else {
      out.push({ from: i, to: i + 1, vowel: isVowelChar(s[i]), c: s[i] });
      i += 1;
    }
  }
  return out;
}

/** Two vowels side by side are said apart (hiatus): both strong, or a stressed í/ú next to a strong one. */
function hiatus(a: string, b: string) {
  const strong = (c: string) => STRONG.includes(c);
  const accWeak = (c: string) => ACCENTED_WEAK.includes(c);
  return (strong(a) && strong(b)) || (accWeak(a) && strong(b)) || (strong(a) && accWeak(b));
}

/** A name split into syllables, keeping its letters exactly: "Lobolcán" → ["Lo", "bol", "cán"]. */
export function syllables(name: string): string[] {
  const u = units(name);
  // syllable nuclei: runs of vowels, split at a hiatus
  const nuclei: [number, number][] = []; // [first unit, last unit]
  for (let i = 0; i < u.length; i++) {
    if (!u[i].vowel) continue;
    const last = nuclei[nuclei.length - 1];
    if (last && last[1] === i - 1 && !hiatus(u[i - 1].c, u[i].c)) last[1] = i;
    else nuclei.push([i, i]);
  }
  if (nuclei.length <= 1) return [name];
  // where each syllable starts (in units): consonants between two nuclei go mostly to the next one
  const starts = [0];
  for (let n = 1; n < nuclei.length; n++) {
    const a = nuclei[n - 1][1] + 1;
    const b = nuclei[n][0]; // consonants are u[a..b-1]
    const cons = b - a;
    const pair = (i: number) => u[i].c + u[i + 1].c;
    let cut: number;
    if (cons === 0) cut = b;
    else if (cons === 1) cut = a;
    else if (cons === 2) cut = CLUSTERS.has(pair(a)) ? a : a + 1;
    else if (cons === 3) cut = CLUSTERS.has(pair(a + 1)) ? a + 1 : a + 2;
    else cut = b - 2;
    starts.push(cut);
  }
  return starts.map((st, k) => name.slice(u[st].from, k + 1 < starts.length ? u[starts[k + 1]].from : name.length));
}
