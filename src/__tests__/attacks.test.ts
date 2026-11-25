import { describe, expect, it } from 'vitest';
import { SPECIES } from '../game/creatures';
import { ATTACKS, attackDuration, attackHitDelay, attackRecipe } from '../game/attacks';
import { PARTICLES } from '../components/fxParticles';

describe('signature attacks', () => {
  it('gives every Vozimón its own attack animation', () => {
    for (const s of SPECIES) expect(ATTACKS[s.attack], `${s.name}: ${s.attack}`).toBeDefined();
    const looks = SPECIES.map((s) => JSON.stringify(attackRecipe(s.id)));
    expect(new Set(looks).size).toBe(SPECIES.length);
    // no leftovers for attacks that don't exist
    expect(Object.keys(ATTACKS).sort()).toEqual(SPECIES.map((s) => s.attack).sort());
  });

  it('only uses shapes that can be drawn, with sensible sizes and timing', () => {
    for (const s of SPECIES) {
      const r = attackRecipe(s.id);
      expect(PARTICLES[r.particle], `${s.attack}: ${r.particle}`).toBeDefined();
      expect(r.count).toBeGreaterThanOrEqual(1);
      expect(r.size).toBeGreaterThan(0.5);
      expect(r.size).toBeLessThanOrEqual(3);
      expect(attackHitDelay(r)).toBeGreaterThan(200);
      expect(attackDuration(r)).toBeLessThanOrEqual(1400); // battles must not drag
    }
  });
});
