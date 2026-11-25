// Battle and catching math, kept simple and kind for small children.

import { effectiveness } from './elements';
import { TOTAL, type Species } from './creatures';
import type { Rng } from './rng';

/** The player's creatures fight one "level" above their wild cousins. */
export const PLAYER_BONUS = 1;

/** The mythical (#151, the last one to catch) is 5 times as tough as any other wild creature. */
export const MYTHICAL_TOUGHNESS = 5;

export const maxHp = (pow: number) => 20 + pow * 8;
export const playerMaxHp = (s: Species) => maxHp(s.pow + PLAYER_BONUS);
export const wildMaxHp = (s: Species) => maxHp(s.pow) * (s.mythical ? MYTHICAL_TOUGHNESS : 1);

export interface Hit {
  damage: number;
  mult: number;
  crit: boolean;
}

export function attackDamage(attacker: Species, defender: Species, attackerIsPlayer: boolean, rng: Rng): Hit {
  const mult = effectiveness(attacker.types[0], defender.types);
  const crit = rng() < 1 / 12;
  const pow = attacker.pow + (attackerIsPlayer ? PLAYER_BONUS : 0);
  const base = maxHp(pow) / 3;
  const variance = 0.85 + rng() * 0.15;
  const side = attackerIsPlayer ? 1.2 : 0.8;
  const damage = Math.max(1, Math.round(base * mult * variance * (crit ? 1.5 : 1) * side));
  return { damage, mult, crit };
}

/** Easy mode: the higher the Vozidex number, the harder to catch (92% -> 18%). */
export function easyCatchChance(id: number): number {
  return 0.92 - 0.74 * ((id - 1) / (TOTAL - 1));
}

/** Easy mode: after breaking free, chance that it runs away (5% -> 35%). */
export function easyFleeChance(id: number): number {
  return 0.05 + 0.3 * ((id - 1) / (TOTAL - 1));
}

/**
 * Throw a ball: up to 3 wobbles, each passed with p^(1/3),
 * so the overall catch probability is exactly p.
 */
export function rollCatch(p: number, rng: Rng): { shakes: number; caught: boolean } {
  if (p >= 1) return { shakes: 3, caught: true };
  const q = Math.cbrt(Math.max(0, p));
  let shakes = 0;
  for (let i = 0; i < 3; i++) {
    if (rng() < q) shakes++;
    else return { shakes, caught: false };
  }
  return { shakes, caught: true };
}
