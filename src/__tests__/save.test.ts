import { beforeEach, describe, expect, it } from 'vitest';
import {
  exportFileName,
  exportGame,
  importGame,
  parseExport,
  byUse,
  countFight,
  countWin,
  createSlot,
  deleteSlot,
  loadSettings,
  loadSlots,
  loadWorldData,
  nameTaken,
  saveSettings,
  saveSlot,
  saveWorldData,
  setStorage,
  cleanName,
} from '../game/save';
import { DEFAULT_KEYS, rebind } from '../system/keys';

function memoryStorage(initial: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    raw: m,
  };
}

let store = memoryStorage();
beforeEach(() => {
  store = memoryStorage();
  setStorage(store);
});

describe('save slots', () => {
  it('creates, reloads and overwrites a slot', () => {
    const s = createSlot('Ana', 'normal', 1, { caught: [1], seen: [1, 4, 7] });
    expect(loadSlots()).toHaveLength(1);
    expect(loadSlots()[0]).toMatchObject({ name: 'Ana', mode: 'normal', avatar: 1, caught: [1], seen: [1, 4, 7] });
    saveSlot({ ...s, seen: [1, 4, 7, 25], caught: [1, 25] });
    const again = loadSlots();
    expect(again).toHaveLength(1);
    expect(again[0].caught).toEqual([1, 25]);
  });

  it('rejects names that already exist (ignoring case and spaces)', () => {
    createSlot('Ana', 'easy', 0);
    expect(nameTaken('ana', loadSlots())).toBe(true);
    expect(nameTaken('  ANA ', loadSlots())).toBe(true);
    expect(nameTaken('Ana 2', loadSlots())).toBe(false);
    expect(() => createSlot('ANA', 'normal', 0)).toThrow();
    expect(() => createSlot('   ', 'normal', 0)).toThrow();
  });

  it('keeps names short and tidy', () => {
    expect(cleanName('  Super   Exploradora  Valiente ')).toBe('Super Explor');
  });

  it('deletes slots', () => {
    const a = createSlot('Uno', 'easy', 0);
    createSlot('Dos', 'normal', 0);
    deleteSlot(a.id);
    expect(loadSlots().map((s) => s.name)).toEqual(['Dos']);
  });

  it('survives broken or strange data', () => {
    store.setItem('vozimon.partidas.v1', '{not json');
    expect(loadSlots()).toEqual([]);
    expect(store.raw.get('vozimon.partidas.v1.corrupto')).toBe('{not json');
    store.setItem(
      'vozimon.partidas.v1',
      JSON.stringify({ slots: [{ id: 'x', name: 'Leo', caught: [3, 3, 999, -1], seen: [2] }, { id: 'y' }] }),
    );
    const slots = loadSlots();
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ name: 'Leo', mode: 'normal', map: 'estaciones', caught: [3], seen: [2, 3] }); // games from before the second map
  });

  it('keeps a fight record for each Vozimón and offers the most used first', () => {
    let r = createSlot('Teo', 'normal', 0, { caught: [1] }).record;
    expect(r).toEqual({});
    r = countFight(r, 7); // sent out, lost
    r = countWin(countFight(r, 4), 4); // sent out, won
    r = countWin(countFight(r, 4), 4);
    expect(r).toEqual({ 7: { fights: 1, wins: 0 }, 4: { fights: 2, wins: 2 } });
    expect(byUse([1, 4, 7, 9], r)).toEqual([4, 7, 1, 9]); // never used: Vozidex order
    // stored and loaded with the slot; broken entries are dropped
    const slot = { ...loadSlots()[0], record: { ...r, 999: { fights: 1, wins: 0 }, 9: { fights: 2, wins: 5 } } };
    saveSlot(slot);
    expect(loadSlots()[0].record).toEqual({ ...r, 9: { fights: 2, wins: 2 } });
  });

  it('remembers the secret unlock per game (off for new and old games)', () => {
    const s = createSlot('Kai', 'normal', 0);
    expect(s.allUnlocked).toBe(false);
    saveSlot({ ...s, allUnlocked: true });
    expect(loadSlots().find((x) => x.name === 'Kai')?.allUnlocked).toBe(true);
  });

  it('remembers which Vozimón names were read out loud (only known ones)', () => {
    const s = createSlot('Bea', 'easy', 0, { caught: [1, 4], seen: [9] });
    expect(s.read).toEqual([]);
    saveSlot({ ...s, read: [4, 1, 4, 7, 9, 999] });
    expect(loadSlots().find((x) => x.name === 'Bea')?.read).toEqual([1, 4, 9]);
    // games from before reading aloud
    store.setItem('vozimon.partidas.v1', JSON.stringify({ version: 1, slots: [{ id: 'old', name: 'Leo', mode: 'easy', caught: [1], seen: [1] }] }));
    expect(loadSlots()[0].read).toEqual([]);
  });

  it('exports a game to a file and imports it as a new game with a new name', () => {
    const ana = saveSlot({ ...createSlot('Ana', 'easy', 2, { caught: [1, 4], seen: [1, 4, 7] }, 'santiago'), record: { 4: { fights: 3, wins: 2 } }, read: [4], allUnlocked: true });
    saveWorldData(ana.id, { v: 1, map: 'santiago', player: { x: 5, y: 6, dir: 'up' } });
    expect(exportFileName(ana, new Date(2026, 10, 19))).toBe('vozimon-ana-2026-11-19.vozimon');
    const text = exportGame(ana);

    const game = parseExport(text)!;
    expect(game).toMatchObject({ mode: 'easy', map: 'santiago', avatar: 2, caught: [1, 4], seen: [1, 4, 7], read: [4], allUnlocked: true });
    // the name inside the file is not used: the player picks one, unique as always
    expect(() => importGame('ANA', game)).toThrow();
    const copy = importGame('Ana 2', game);
    expect(copy.id).not.toBe(ana.id);
    expect(loadSlots().map((x) => x.name).sort()).toEqual(['Ana', 'Ana 2']);
    expect(loadSlots().find((x) => x.name === 'Ana 2')).toMatchObject({ caught: [1, 4], record: { 4: { fights: 3, wins: 2 } }, read: [4], map: 'santiago' });
    expect(loadWorldData(copy.id)).toEqual(loadWorldData(ana.id));
    // the copy is its own game: changing it leaves the original alone
    saveSlot({ ...copy, caught: [1, 4, 7] });
    expect(loadSlots().find((x) => x.name === 'Ana')?.caught).toEqual([1, 4]);
  });

  it('refuses files that are not Vozimón games, and cleans odd values', () => {
    expect(parseExport('hola')).toBeNull();
    expect(parseExport(JSON.stringify({ format: 'otra-cosa', game: {} }))).toBeNull();
    const odd = parseExport(JSON.stringify({ format: 'vozimon-partida', game: { mode: 'raro', caught: [3, 999, -1], seen: 'x' } }))!;
    expect(odd).toMatchObject({ mode: 'normal', map: 'estaciones', caught: [3], seen: [3], read: [], allUnlocked: false, world: null });
    // files saved before the rename (Edumon -> Vozimon) still load
    expect(parseExport(JSON.stringify({ format: 'edumon-partida', game: { mode: 'easy', caught: [2] } }))).toMatchObject({ mode: 'easy', caught: [2] });
  });

  it('remembers the map of each game', () => {
    createSlot('Sol', 'normal', 0, {}, 'santiago');
    createSlot('Luna', 'easy', 0);
    const slots = loadSlots();
    expect(slots.find((x) => x.name === 'Sol')?.map).toBe('santiago');
    expect(slots.find((x) => x.name === 'Luna')?.map).toBe('estaciones');
  });

  it('stores settings, including the chosen keys', () => {
    expect(loadSettings()).toEqual({ sound: true, music: true, font: 'fine', upper: false, reading: true, keys: DEFAULT_KEYS });
    const keys = rebind(DEFAULT_KEYS, 'a', 'k');
    saveSettings({ sound: false, music: true, font: 'pixel', upper: true, reading: false, keys });
    expect(loadSettings()).toEqual({ sound: false, music: true, font: 'pixel', upper: true, reading: false, keys });
    // reading aloud is on by default, also for settings stored before it existed
    store.setItem('vozimon.ajustes.v1', JSON.stringify({ sound: false }));
    expect(loadSettings().reading).toBe(true);
    store.setItem('vozimon.ajustes.v1', JSON.stringify({ reading: 'yes' }));
    expect(loadSettings().reading).toBe(true);
    // broken key data falls back to the defaults
    store.setItem('vozimon.ajustes.v1', JSON.stringify({ keys: { a: 'q', b: 'q' } }));
    expect(loadSettings().keys).toEqual(DEFAULT_KEYS);
  });

  it('stores the world of a slot separately and removes it with the slot', () => {
    const s = createSlot('Mia', 'easy', 0);
    expect(loadWorldData(s.id)).toBeNull();
    saveWorldData(s.id, { v: 1, hello: 'mundo' });
    expect(loadWorldData(s.id)).toEqual({ v: 1, hello: 'mundo' });
    deleteSlot(s.id);
    expect(loadWorldData(s.id)).toBeNull();
  });

  it('moves games saved under the old names (Educatiomon, Edumon) to Vozimon', () => {
    const slots = JSON.stringify({ version: 1, slots: [{ id: 'old', name: 'Leo', mode: 'easy', caught: [1], seen: [1] }] });
    const old = memoryStorage({
      'educatiomon.partidas.v1': slots,
      'educatiomon.mundo.v1.old': '{"v":1}',
      'educatiomon.ajustes.v1': '{"sound":false}',
    });
    setStorage(old);
    expect(loadSlots().map((x) => x.name)).toEqual(['Leo']);
    expect(loadWorldData('old')).toEqual({ v: 1 });
    expect(loadSettings().sound).toBe(false);
    expect([...old.raw.keys()].some((k) => k.startsWith('educatiomon.'))).toBe(false);
  });

  it('moves games saved as Edumon to Vozimon, keeping newer keys', () => {
    const slots = JSON.stringify({ version: 1, slots: [{ id: 'e1', name: 'Ana', mode: 'normal', caught: [4], seen: [4, 5] }] });
    const old = memoryStorage({
      'edumon.partidas.v1': slots,
      'edumon.mundo.v1.e1': '{"v":2}',
      'edumon.ajustes.v1': '{"sound":false}',
      'vozimon.ajustes.v1': '{"music":false}',
    });
    setStorage(old);
    expect(loadSlots().map((x) => x.name)).toEqual(['Ana']);
    expect(loadWorldData('e1')).toEqual({ v: 2 });
    expect(loadSettings().music).toBe(false);
    expect(loadSettings().sound).toBe(true); // the newer settings win
    expect([...old.raw.keys()].some((k) => k.startsWith('edumon.'))).toBe(false);
  });
});
