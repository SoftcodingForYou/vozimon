// Save slots ("partidas") and settings, stored in the browser's localStorage.
// The Vozidex (seen / caught) is saved on every change; the exact state of the
// world (player, wild creatures...) is stored separately every few steps.

import { TOTAL } from './creatures';
import { DEFAULT_KEYS, sanitizeBindings, type KeyBindings } from '../system/keys';
import type { MapId } from '../world/tiles';

export type Mode = 'normal' | 'easy';

export interface SaveSlot {
  id: string;
  name: string;
  mode: Mode;
  map: MapId; // the world this game is played in (chosen when it is created)
  avatar: number;
  seen: number[];
  caught: number[];
  record: FightRecords; // how often each of the child's Vozimón fought, and won
  read: number[]; // known Vozimón whose name the child has read out loud
  allUnlocked: boolean; // secret code typed: everything that needs all 150 caught is open
  created: number;
  updated: number;
}

/** 'fine': a clear font made for children learning to read; 'pixel': the retro pixel font. */
export type FontStyle = 'fine' | 'pixel';

/** A creature's battles: how often it was sent out to fight, and how many of those it won. */
export interface FightRecord {
  fights: number;
  wins: number;
}
export type FightRecords = Record<number, FightRecord>;

export const NO_FIGHTS: FightRecord = { fights: 0, wins: 0 };

/** Old saves have no record yet; anything odd is dropped (wins can't exceed fights). */
function validRecords(v: unknown): FightRecords {
  const out: FightRecords = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id < 1 || id > TOTAL || !r || typeof r !== 'object') continue;
    const { fights, wins } = r as Record<string, unknown>;
    if (!Number.isInteger(fights) || !Number.isInteger(wins) || (fights as number) < 1 || (wins as number) < 0) continue;
    out[id] = { fights: fights as number, wins: Math.min(wins as number, fights as number) };
  }
  return out;
}

/**
 * The child's Vozimón in the order they are offered for a fight: the ones used most come first
 * (ties keep the Vozidex order). The Vozidex itself always stays in Vozidex order.
 */
export function byUse(ids: number[], record: FightRecords): number[] {
  const fights = (id: number) => record[id]?.fights ?? 0;
  return [...ids].sort((a, b) => fights(b) - fights(a) || a - b);
}

/** A creature was sent out to fight (counted once per battle). */
export function countFight(record: FightRecords, id: number): FightRecords {
  const r = record[id] ?? NO_FIGHTS;
  return { ...record, [id]: { fights: r.fights + 1, wins: r.wins } };
}

/** A creature knocked out the wild one: a win (its fight was already counted). */
export function countWin(record: FightRecords, id: number): FightRecords {
  const r = record[id] ?? NO_FIGHTS;
  return { ...record, [id]: { fights: Math.max(1, r.fights), wins: r.wins + 1 } };
}

export interface Settings {
  sound: boolean;
  music: boolean;
  font: FontStyle;
  upper: boolean; // show every text in capital letters
  reading: boolean; // read names out loud with the microphone (on unless switched off in Ajustes)
  keys: KeyBindings;
}

export const MAX_NAME = 12;
const PREFIX = 'vozimon.';
const OLD_PREFIXES = ['edumon.', 'educatiomon.']; // the game's former names, newest first
const SLOTS_KEY = PREFIX + 'partidas.v1';
const SETTINGS_KEY = PREFIX + 'ajustes.v1';
const WORLD_KEY = PREFIX + 'mundo.v1.';

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key?(i: number): string | null;
  readonly length?: number;
}

// In-memory fallback (private browsing, blocked storage, tests).
const memory = new Map<string, string>();
const memoryStore: KV = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

/** Move games saved before the renames (Educatiomon -> Edumon -> Vozimon) to the new keys. */
function migrateOldSaves(s: KV) {
  try {
    if (!s.key || !s.length) return;
    for (const prefix of OLD_PREFIXES) {
      const old: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith(prefix)) old.push(k);
      }
      for (const k of old) {
        const nk = PREFIX + k.slice(prefix.length);
        const v = s.getItem(k);
        if (v !== null && s.getItem(nk) === null) s.setItem(nk, v);
        s.removeItem(k);
      }
    }
  } catch (err) {
    console.warn('No se pudieron mover las partidas antiguas', err);
  }
}

let store: KV | null = null;
function kv(): KV {
  if (store) return store;
  try {
    const ls = (globalThis as { localStorage?: KV }).localStorage;
    if (ls) {
      const probe = '__vozimon__';
      ls.setItem(probe, probe);
      ls.removeItem(probe);
      store = ls;
      migrateOldSaves(store);
      return store;
    }
  } catch {
    // fall through to memory
  }
  store = memoryStore;
  return store;
}

/** For tests: use a specific storage. */
export function setStorage(s: KV | null) {
  store = s;
  if (s) migrateOldSaves(s);
}

export function storageIsPersistent(): boolean {
  return kv() !== memoryStore;
}

const validIds = (v: unknown): number[] => {
  if (!Array.isArray(v)) return [];
  const set = new Set<number>();
  for (const x of v) if (Number.isInteger(x) && x >= 1 && x <= TOTAL) set.add(x);
  return [...set].sort((a, b) => a - b);
};

function sanitize(raw: unknown): SaveSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string' || !r.name.trim()) return null;
  const caught = validIds(r.caught);
  const seen = validIds([...(Array.isArray(r.seen) ? r.seen : []), ...caught]);
  return {
    id: r.id,
    name: cleanName(r.name),
    mode: r.mode === 'easy' ? 'easy' : 'normal',
    map: r.map === 'santiago' ? 'santiago' : 'estaciones', // games from before the second map
    avatar: Number.isInteger(r.avatar) ? (r.avatar as number) : 0,
    seen,
    caught,
    record: validRecords(r.record),
    read: validIds(r.read).filter((id) => seen.includes(id)),
    allUnlocked: r.allUnlocked === true,
    created: typeof r.created === 'number' ? r.created : Date.now(),
    updated: typeof r.updated === 'number' ? r.updated : Date.now(),
  };
}

export function loadSlots(): SaveSlot[] {
  const raw = kv().getItem(SLOTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { slots?: unknown[] };
    const slots = (parsed.slots ?? []).map(sanitize).filter((s): s is SaveSlot => s !== null);
    return slots.sort((a, b) => b.updated - a.updated);
  } catch {
    // Keep the broken data aside instead of silently losing it.
    kv().setItem(SLOTS_KEY + '.corrupto', raw);
    return [];
  }
}

function writeSlots(slots: SaveSlot[]) {
  try {
    kv().setItem(SLOTS_KEY, JSON.stringify({ version: 1, slots }));
  } catch (err) {
    console.warn('No se pudo guardar la partida', err);
  }
}

export function cleanName(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

/** Names are compared ignoring case and extra spaces ("Ana" == " ana "). */
export function sameName(a: string, b: string): boolean {
  return cleanName(a).toLocaleLowerCase('es') === cleanName(b).toLocaleLowerCase('es');
}

export function nameTaken(name: string, slots: SaveSlot[]): boolean {
  return slots.some((s) => sameName(s.name, name));
}

const newSlotId = (now: number) => `p${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

export function createSlot(
  name: string,
  mode: Mode,
  avatar: number,
  start: { seen?: number[]; caught?: number[] } = {},
  map: MapId = 'estaciones',
): SaveSlot {
  const clean = cleanName(name);
  if (!clean) throw new Error('El nombre está vacío');
  const slots = loadSlots();
  if (nameTaken(clean, slots)) throw new Error('Ese nombre ya existe');
  const now = Date.now();
  const caught = validIds(start.caught ?? []);
  const slot: SaveSlot = {
    id: newSlotId(now),
    name: clean,
    mode,
    map,
    avatar,
    seen: validIds([...(start.seen ?? []), ...caught]),
    caught,
    record: {},
    read: [],
    allUnlocked: false,
    created: now,
    updated: now,
  };
  writeSlots([slot, ...slots]);
  return slot;
}

/** Overwrite a slot (the chosen game state is always saved onto itself). */
export function saveSlot(slot: SaveSlot): SaveSlot {
  const updated = { ...slot, updated: Date.now() };
  const others = loadSlots().filter((s) => s.id !== slot.id);
  writeSlots([updated, ...others]);
  return updated;
}

export function deleteSlot(id: string) {
  writeSlots(loadSlots().filter((s) => s.id !== id));
  kv().removeItem(WORLD_KEY + id);
}

// ------------------------------------------------------------ files (move a game elsewhere)

/** Marks a file as an exported Vozimón game. */
export const EXPORT_FORMAT = 'vozimon-partida';
/** Files exported before the game was renamed (Edumon -> Vozimon) still load. */
const OLD_EXPORT_FORMATS = ['edumon-partida'];
/** File extension of exported games (the content is JSON). */
export const EXPORT_EXT = 'vozimon';
/** Extensions of exported games from before the rename, still accepted when loading a file. */
export const OLD_EXPORT_EXTS = ['edumon'];

/** Everything an exported game carries, except its name (the player picks a new one on import). */
export interface ImportedGame {
  mode: Mode;
  map: MapId;
  avatar: number;
  seen: number[];
  caught: number[];
  record: FightRecords;
  read: number[];
  allUnlocked: boolean;
  world: unknown; // the exact world state (checked again when the game is loaded)
}

/** A game as a file's text: the Vozidex, fight records, settings of the game and the world state. */
export function exportGame(slot: SaveSlot): string {
  return JSON.stringify({
    format: EXPORT_FORMAT,
    version: 1,
    exported: new Date().toISOString(),
    name: slot.name, // just for people looking at the file: importing asks for a new name
    game: {
      mode: slot.mode,
      map: slot.map,
      avatar: slot.avatar,
      seen: slot.seen,
      caught: slot.caught,
      record: slot.record,
      read: slot.read,
      allUnlocked: slot.allUnlocked,
    },
    world: loadWorldData(slot.id),
  });
}

/** A suggested file name for an exported game, e.g. "vozimon-ana-2026-11-19.vozimon". */
export function exportFileName(slot: SaveSlot, d = new Date()): string {
  const ascii = slot.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `vozimon-${ascii || 'partida'}-${day}.${EXPORT_EXT}`;
}

/** Read an exported game (null if the text isn't one). Everything is checked like a stored slot. */
export function parseExport(text: string): ImportedGame | null {
  try {
    const d = JSON.parse(text) as Record<string, unknown>;
    if (!d || (d.format !== EXPORT_FORMAT && !OLD_EXPORT_FORMATS.includes(d.format as string)) || !d.game || typeof d.game !== 'object') return null;
    const s = sanitize({ ...(d.game as object), id: 'import', name: 'import' });
    if (!s) return null;
    return { mode: s.mode, map: s.map, avatar: s.avatar, seen: s.seen, caught: s.caught, record: s.record, read: s.read, allUnlocked: s.allUnlocked, world: d.world ?? null };
  } catch {
    return null;
  }
}

/** Create a new game from an imported file, under the name the player chose. */
export function importGame(name: string, g: ImportedGame): SaveSlot {
  const clean = cleanName(name);
  if (!clean) throw new Error('El nombre está vacío');
  const slots = loadSlots();
  if (nameTaken(clean, slots)) throw new Error('Ese nombre ya existe');
  const now = Date.now();
  const slot: SaveSlot = {
    id: newSlotId(now),
    name: clean,
    mode: g.mode,
    map: g.map,
    avatar: g.avatar,
    seen: [...g.seen],
    caught: [...g.caught],
    record: { ...g.record },
    read: [...g.read],
    allUnlocked: g.allUnlocked,
    created: now,
    updated: now,
  };
  writeSlots([slot, ...slots]);
  if (g.world) saveWorldData(slot.id, g.world);
  return slot;
}

/** Store the exact world state of a slot (see snapshotWorld in world.ts). */
export function saveWorldData(slotId: string, data: unknown) {
  try {
    kv().setItem(WORLD_KEY + slotId, JSON.stringify(data));
  } catch (err) {
    console.warn('No se pudo guardar el mundo', err);
  }
}

export function loadWorldData(slotId: string): unknown {
  try {
    const raw = kv().getItem(WORLD_KEY + slotId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const DEFAULT_SETTINGS: Settings = { sound: true, music: true, font: 'fine', upper: false, reading: true, keys: { ...DEFAULT_KEYS } };

export function loadSettings(): Settings {
  try {
    const raw = kv().getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_KEYS } };
    const s = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: s.sound ?? DEFAULT_SETTINGS.sound,
      music: s.music ?? DEFAULT_SETTINGS.music,
      font: s.font === 'pixel' ? 'pixel' : 'fine',
      upper: s.upper === true,
      reading: typeof s.reading === 'boolean' ? s.reading : DEFAULT_SETTINGS.reading,
      keys: sanitizeBindings(s.keys),
    };
  } catch {
    return { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_KEYS } };
  }
}

export function saveSettings(s: Settings) {
  kv().setItem(SETTINGS_KEY, JSON.stringify(s));
}
