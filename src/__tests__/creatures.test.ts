import { describe, expect, it } from 'vitest';
import { SPECIES, TOTAL, STARTERS, LEGENDARY_IDS, MYTHICAL_ID, getSpecies } from '../game/creatures';
import { ELEMS } from '../game/elements';
import { drawCreature, PORTRAIT_SIZE } from '../art/creatureArt';

describe('Vozimon roster', () => {
  it('has 151 creatures numbered 1..151', () => {
    expect(TOTAL).toBe(151);
    SPECIES.forEach((s, i) => expect(s.id).toBe(i + 1));
  });

  it('uses unique, non-empty names and texts', () => {
    const names = new Set(SPECIES.map((s) => s.name.toLowerCase()));
    expect(names.size).toBe(151);
    for (const s of SPECIES) {
      expect(s.name.trim().length).toBeGreaterThan(2);
      expect(s.attack.trim().length).toBeGreaterThan(2);
      expect(s.desc.trim().length).toBeGreaterThan(10);
      expect(s.habitats.length).toBeGreaterThan(0);
      expect(s.types.length).toBeGreaterThan(0);
      for (const t of s.types) expect(ELEMS[t]).toBeDefined();
    }
  });

  it('has three starters, six legendaries and one mythical', () => {
    expect(STARTERS.map((id) => getSpecies(id).types[0])).toEqual(['fuego', 'agua', 'planta']);
    expect(LEGENDARY_IDS).toEqual([145, 146, 147, 148, 149, 150]);
    expect(MYTHICAL_ID).toBe(151);
  });

  it('makes evolved forms stronger and rarer', () => {
    for (const s of SPECIES) {
      if (s.stage > 1) {
        const prev = getSpecies(s.id - 1);
        expect(s.pow).toBeGreaterThan(prev.pow);
        expect(s.rarity).toBeLessThan(prev.rarity);
      }
    }
  });

  it('draws every portrait inside its canvas with an outline', () => {
    for (const s of SPECIES) {
      const img = drawCreature(s.art, s.stage);
      expect(img.w).toBe(PORTRAIT_SIZE);
      let filled = 0;
      let touchesEdge = false;
      for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
          if (img.data[(y * img.w + x) * 4 + 3] === 0) continue;
          filled++;
          if (x === 0 || y === 0 || x === img.w - 1 || y === img.h - 1) touchesEdge = true;
        }
      }
      expect(filled, s.name).toBeGreaterThan(150);
      expect(touchesEdge, `${s.name} is cut at the border`).toBe(false);
    }
  });
});
