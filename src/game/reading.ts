// Reading names out loud: does what the speech recogniser heard sound like the creature's name?
// And the name split into syllables (Chis·pín), to help when it didn't work yet.

import { SPECIES } from './creatures';

/**
 * How alike the reading must sound like the name (0..1) to count. Generous on purpose: the readers
 * are young children just starting (and grown-ups with a foreign accent); perfect pronunciation
 * can't be expected. Each try that wasn't understood makes the next one a little easier.
 */
export const READ_MATCH = 0.6;
const EASIER_PER_MISS = 0.02;
const READ_MATCH_MIN = 0.55;
/** A longer word that only starts like the name (recognisers finish names as real words) counts a bit less. */
const START_ONLY = 0.9;
/** Much shorter than the name is only a piece of it (the first syllable or so). */
const MIN_LENGTH = 0.65;
/**
 * When a reading was another Vozimón's name instead: it sounds the same as that one (SAME_NAME), or
 * it sounds like it (OTHER_NAME) and clearly more than like this one (by MARGIN). A near tie counts
 * for the name on screen ("chipín" is Chispín with its s swallowed, even if Chivín is a hair closer).
 */
const SAME_NAME = 0.95;
const OTHER_NAME = 0.8;
const MARGIN = 0.05;

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

/**
 * Sounds that beginning readers, foreign speakers and recognisers easily mix up: swapping them costs
 * little. (Keys: X = ch, N = ñ, j = the Spanish jota.)
 */
const pairs = (list: string, cost: number) => list.split(' ').flatMap((p) => [[p, cost] as const, [p[1] + p[0], cost] as const]);
const SWAP = new Map<string, number>([
  // close vowels, voiced / voiceless, the nasals, r said as l
  ...pairs('ei ou bp dt kg nm nN yi rl Xs', 0.35),
  // any other vowel, r said as d or in the throat, sh-like sounds, ll said as l, the jota, f
  ...pairs('ae ai ao au eo eu ia io iu rd ld rg rj Xy sy ly jk jg fb fp bm', 0.6),
]);
const subCost = (a: string, b: string) => (a === b ? 0 : (SWAP.get(a + b) ?? 1));
/**
 * Leaving out a sound of the name: half a mistake for the ones children swallow (an s or d, the r / l
 * of "tr", "bl"...), a whole one otherwise. Sounds that weren't in the name always cost a whole one.
 */
const dropCost = (name: string, j: number) => {
  const c = name[j];
  if (c === 's' || c === 'd') return 0.5;
  return (c === 'r' || c === 'l') && j > 0 && !'aeiou'.includes(name[j - 1]) ? 0.5 : 1;
};

/** How many mistakes apart what was heard is from the name (both as sound keys; weighted edit distance). */
function distance(heard: string, name: string): number {
  if (heard === name) return 0;
  let prev = [0];
  for (let j = 1; j <= name.length; j++) prev[j] = prev[j - 1] + dropCost(name, j - 1);
  for (let i = 1; i <= heard.length; i++) {
    const cur = [prev[0] + 1];
    for (let j = 1; j <= name.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + dropCost(name, j - 1), prev[j - 1] + subCost(heard[i - 1], name[j - 1]));
    }
    prev = cur;
  }
  return prev[name.length];
}

/** 1 = sounds the same, 0 = nothing alike. */
export function soundsAlike(a: string, b: string): number {
  const ka = soundKey(a);
  const kb = soundKey(b);
  return likeness(ka, kb);
}

let rosterKeys: { id: number; key: string }[] | null = null;
const keys = () => (rosterKeys ??= SPECIES.map((s) => ({ id: s.id, key: soundKey(s.name) })));

function likeness(key: string, other: string) {
  return key && other ? Math.max(0, 1 - distance(key, other) / Math.max(key.length, other.length)) : 0;
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
 * Did the child read this creature's name? `heard` are the recogniser's guesses, `misses` the tries
 * that weren't understood so far (each one lowers the bar a little). A guess counts when it sounds
 * enough like the name, unless it clearly is another Vozimón's name (so "Lanita" doesn't count for
 * Ranita, nor "Trinero" for Trinín, but "ranitas", "Anita" or a muddled reading do: the child is
 * looking at this name). Recognisers like to finish invented names as real words ("Trinín" →
 * "Trinidad"), so a longer word is also compared by its start.
 */
export function heardName(heard: string[], id: number, misses = 0): boolean {
  const all = keys();
  const target = all.find((k) => k.id === id);
  if (!target) return false;
  const need = Math.max(READ_MATCH_MIN, READ_MATCH - misses * EASIER_PER_MISS);
  for (const t of heard) {
    for (const p of pieces(t)) {
      const k = soundKey(p);
      if (k.length < target.key.length * MIN_LENGTH) continue;
      const start = k.length > target.key.length ? k.slice(0, target.key.length) : k;
      const s = Math.max(likeness(k, target.key), START_ONLY * likeness(start, target.key));
      if (s < need) continue;
      const wasOther = (o: { key: string }) => {
        const l = Math.max(likeness(k, o.key), START_ONLY * likeness(start, o.key));
        return l > s && (l >= SAME_NAME || (l >= OTHER_NAME && l - s >= MARGIN));
      };
      if (!all.some((o) => o.id !== id && wasOther(o))) return true;
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
