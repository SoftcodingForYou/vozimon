import { describe, expect, it } from 'vitest';
import { BTN_ORDER, DEFAULT_KEYS, SECRET_CODE, buttonForKey, keyLabel, rebind, sanitizeBindings, typedTail } from '../system/keys';
import { TYPE_ORDER, strongAgainst, weakAgainst, effectiveness } from '../game/elements';

describe('key bindings', () => {
  it('has a different key for every button', () => {
    expect(new Set(BTN_ORDER.map((b) => DEFAULT_KEYS[b])).size).toBe(BTN_ORDER.length);
  });

  it('swaps keys instead of giving two buttons the same key', () => {
    const k = rebind(DEFAULT_KEYS, 'a', 'x');
    expect(k.a).toBe('x');
    expect(k.b).toBe(' ');
    expect(rebind(DEFAULT_KEYS, 'map', 'P').map).toBe('p');
    expect(rebind(DEFAULT_KEYS, 'map', 'Q')).toMatchObject({ map: 'q', menu: 'm' }); // Q was the menu key
  });

  it('answers to exactly one key per button', () => {
    expect(buttonForKey(DEFAULT_KEYS, DEFAULT_KEYS.a)).toBe('a');
    expect(buttonForKey(DEFAULT_KEYS, DEFAULT_KEYS.a.toUpperCase())).toBe('a'); // Shift doesn't matter
    for (const k of ['Enter', 'Escape', 'Backspace']) expect(buttonForKey(DEFAULT_KEYS, k)).toBeNull();
    // after choosing W for "up", the arrow no longer moves
    const wasd = rebind(DEFAULT_KEYS, 'up', 'w');
    expect(buttonForKey(wasd, 'w')).toBe('up');
    expect(buttonForKey(wasd, 'ArrowUp')).toBeNull();
    // only while typing a name: Intro confirms and Esc goes back
    expect(buttonForKey(DEFAULT_KEYS, 'Enter', true)).toBe('a');
    expect(buttonForKey(DEFAULT_KEYS, 'Escape', true)).toBe('b');
  });

  it('recognises the secret code among other keys', () => {
    let tail = '';
    for (const k of ['ArrowUp', 'x', 'E', 'd', ' ', 'u', 'B', 'o', 's', 'Shift', 's']) tail = typedTail(tail, k);
    expect(tail).toBe(SECRET_CODE); // letters only, any case; arrows, Shift and spaces don't count
    expect(typedTail(tail, 'a')).not.toBe(SECRET_CODE);
  });

  it('shows friendly key names', () => {
    expect(keyLabel('z')).toBe('Z');
    expect(keyLabel(' ')).toBe('Espacio');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Enter')).toBe('Intro');
  });

  it('ignores broken or reserved stored keys', () => {
    expect(sanitizeBindings(null)).toEqual(DEFAULT_KEYS);
    expect(sanitizeBindings({ a: 'Escape' }).a).toBe(' ');
    expect(sanitizeBindings({ types: ' ' })).toEqual(DEFAULT_KEYS); // duplicate of A
  });

  it('uses Space for A, also for players who kept the old default Z', () => {
    expect(DEFAULT_KEYS.a).toBe(' ');
    const oldDefaults = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'z', b: 'x', types: 't', map: 'm' };
    expect(sanitizeBindings(oldDefaults)).toEqual(DEFAULT_KEYS);
    // someone who chose their own keys keeps Z
    expect(sanitizeBindings({ ...oldDefaults, b: 'c' })).toMatchObject({ a: 'z', b: 'c' });
  });

  it('gives buttons added later (Menú, Vozidex) a key without losing the chosen ones', () => {
    const old = { up: 'w', down: 's', left: 'a', right: 'd', a: 'j', b: 'k', types: 't', map: 'm' };
    expect(sanitizeBindings(old)).toEqual({ ...old, menu: 'q', dex: 'e' });
    // the player already used E for something else: Vozidex gets a free key
    const taken = sanitizeBindings({ ...old, types: 'e' });
    expect(taken.types).toBe('e');
    expect(new Set(Object.values(taken)).size).toBe(BTN_ORDER.length);
    expect(taken.dex).not.toBe('e');
  });
});

describe('type chart overview', () => {
  it('matches the battle rules', () => {
    for (const a of TYPE_ORDER) {
      for (const d of strongAgainst(a)) expect(effectiveness(a, [d])).toBe(2);
      for (const d of weakAgainst(a)) expect(effectiveness(a, [d])).toBe(0.5);
    }
  });
});
