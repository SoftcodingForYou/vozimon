import { describe, expect, it } from 'vitest';
import { effectiveness } from '../game/elements';
import { attackDamage, easyCatchChance, easyFleeChance, rollCatch, playerMaxHp, wildMaxHp, maxHp, MYTHICAL_TOUGHNESS } from '../game/battle';
import { getSpecies, MYTHICAL_ID, SPECIES } from '../game/creatures';
import { mulberry32 } from '../game/rng';

describe('type chart', () => {
  it('knows the classic triangle', () => {
    expect(effectiveness('agua', ['fuego'])).toBe(2);
    expect(effectiveness('fuego', ['planta'])).toBe(2);
    expect(effectiveness('planta', ['agua'])).toBe(2);
    expect(effectiveness('fuego', ['agua'])).toBe(0.5);
    expect(effectiveness('normal', ['normal'])).toBe(1);
  });

  it('never makes an attack useless', () => {
    for (const a of SPECIES) for (const d of SPECIES) expect(effectiveness(a.types[0], d.types)).toBeGreaterThan(0);
  });
});

describe('battles', () => {
  it('always does at least 1 damage and favours the player', () => {
    const rng = mulberry32(1);
    const a = getSpecies(1);
    const b = getSpecies(1);
    let mine = 0;
    let wild = 0;
    for (let i = 0; i < 500; i++) {
      mine += attackDamage(a, b, true, rng).damage;
      wild += attackDamage(b, a, false, rng).damage;
    }
    expect(mine).toBeGreaterThan(wild);
    expect(attackDamage(getSpecies(10), getSpecies(147), true, rng).damage).toBeGreaterThanOrEqual(1);
  });

  it('lets an equal creature win in a few hits', () => {
    const s = getSpecies(16);
    const rng = mulberry32(7);
    let hp = wildMaxHp(s);
    let hits = 0;
    while (hp > 0) {
      hp -= attackDamage(s, s, true, rng).damage;
      hits++;
    }
    expect(hits).toBeLessThanOrEqual(4);
    expect(playerMaxHp(s)).toBeGreaterThan(wildMaxHp(s));
  });

  it('makes the mythical five times as tough as any other wild creature', () => {
    const mythical = getSpecies(MYTHICAL_ID);
    expect(MYTHICAL_TOUGHNESS).toBe(5);
    expect(wildMaxHp(mythical)).toBe(5 * maxHp(mythical.pow));
    const toughestOther = Math.max(...SPECIES.filter((s) => !s.mythical).map(wildMaxHp));
    expect(wildMaxHp(mythical)).toBeGreaterThanOrEqual(5 * toughestOther);
  });
});

describe('easy mode catching', () => {
  it('gets harder with the Vozidex number', () => {
    for (let id = 2; id <= 151; id++) {
      expect(easyCatchChance(id)).toBeLessThan(easyCatchChance(id - 1));
      expect(easyFleeChance(id)).toBeGreaterThan(easyFleeChance(id - 1));
    }
    expect(easyCatchChance(1)).toBeCloseTo(0.92);
    expect(easyCatchChance(151)).toBeCloseTo(0.18);
  });

  it('rolls catches with the requested probability', () => {
    const rng = mulberry32(42);
    for (const p of [0.18, 0.5, 0.92]) {
      let ok = 0;
      const n = 20000;
      for (let i = 0; i < n; i++) {
        const r = rollCatch(p, rng);
        if (r.caught) {
          ok++;
          expect(r.shakes).toBe(3);
        } else expect(r.shakes).toBeLessThan(3);
      }
      expect(ok / n).toBeGreaterThan(p - 0.02);
      expect(ok / n).toBeLessThan(p + 0.02);
    }
    expect(rollCatch(1, rng)).toEqual({ shakes: 3, caught: true });
  });
});
