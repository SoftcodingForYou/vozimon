// The living world: the player walks around, wild Vozimon wander and
// appear around the player. Pure logic (no drawing), so it can be tested.

import { SPECIES, MYTHICAL_ID, TOTAL, getSpecies, type Species } from '../game/creatures';
import { mulberry32, pickWeighted, type SeededRng } from '../game/rng';
import { T, B, canStep, isWalkable, type WorldMap } from './tiles';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIR_VEC: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const ALL_DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export interface Mover {
  x: number; // logical cell (destination while moving)
  y: number;
  fx: number; // cell we come from
  fy: number;
  t: number; // 0..1 progress of the current step
  moving: boolean;
  dir: Dir;
  dur: number; // seconds per step
}

export interface Player extends Mover {
  animT: number;
}

export interface WildCreature extends Mover {
  uid: number;
  sp: number;
  nextMove: number;
  shy: boolean;
  spot: number; // index into map.spots for legendaries, -1 otherwise
  path?: number[]; // the mythical's route to its current destination (cell indices)
  waited?: number; // steps it couldn't take (someone in the way)
}

export interface Encounter {
  sp: number;
  uid: number | null; // null = hidden in the tall grass
  spot: number;
  biome: number;
}

export interface WorldState {
  map: WorldMap;
  rng: SeededRng;
  player: Player;
  creatures: WildCreature[];
  time: number;
  grace: number;
  nextUid: number;
  spawnTimer: number;
  spotCooldown: number[];
  caught: Set<number>;
  bumpCooldown: number;
  steps: number; // steps walked (the game saves every AUTOSAVE_STEPS steps)
  unlockAll: boolean; // secret code: behave as if all 150 were caught (the Vozidex stays as it is)
  signWait: number; // seconds before the same sign can be read again (key held against it)
}

export interface WorldInput {
  dir: Dir | null;
  run: boolean;
}

export interface WorldEvents {
  encounter: Encounter | null;
  bump: boolean;
  rustle: boolean;
  autosave: boolean; // true on every AUTOSAVE_STEPS-th step
  sign: number | null; // read the sign of a legendary that went away (its species)
}

/**
 * While a legendary is away after a battle (its short cooldown), a sign stands at its home:
 * "¡X se fue! Tal vez vuelva pronto." Returns the species if (x, y) is such a sign.
 */
export function signAt(ws: WorldState, x: number, y: number): number | null {
  const k = ws.map.spots.findIndex((s) => s.x === x && s.y === y);
  if (k < 0) return null;
  const s = ws.map.spots[k];
  return ws.spotCooldown[k] > 0 && !ws.caught.has(s.species) ? s.species : null;
}

export const AUTOSAVE_STEPS = 5;

export const WALK_TIME = 0.17;
export const RUN_TIME = 0.095;
const CREATURE_TIME = 0.34;
const FLEE_TIME = 0.24;
const MAX_CREATURES = 14;
const SPAWN_RX = 20;
const SPAWN_RY = 15;
const DESPAWN = 30;
const VIEW_RX = 9;
const VIEW_RY = 7;
export const GRASS_CHANCE = 0.085;

interface ZoneInfo {
  pools: Species[][]; // wild creatures of each zone
  allowed: Map<number, Set<number>>; // species -> zones it may wander into
}
const zoneCache = new WeakMap<WorldMap, ZoneInfo>();

/** Who lives in each zone: by habitat (Estaciones) or by type (Santiago's districts). */
function zoneInfo(map: WorldMap): ZoneInfo {
  let info = zoneCache.get(map);
  if (!info) {
    const pools = map.zones.map((z) =>
      SPECIES.filter((s) => s.rarity > 0 && (z.type ? s.types.includes(z.type) : s.habitats.some((h) => z.habitats?.includes(h)))),
    );
    const allowed = new Map<number, Set<number>>();
    pools.forEach((pool, k) => {
      for (const s of pool) {
        if (!allowed.has(s.id)) allowed.set(s.id, new Set());
        allowed.get(s.id)!.add(k);
      }
    });
    info = { pools, allowed };
    zoneCache.set(map, info);
  }
  return info;
}

export function speciesForZone(map: WorldMap, zone: number): Species[] {
  return zoneInfo(map).pools[zone] ?? [];
}

/** The zones (indices into map.zones) where a species can be met in the wild. */
export function zonesOfSpecies(map: WorldMap, sp: number): number[] {
  return [...(zoneInfo(map).allowed.get(sp) ?? [])];
}

export function createWorld(map: WorldMap, caught: number[], seed = Date.now()): WorldState {
  const rng = mulberry32(seed);
  const start = map.starts[Math.floor(rng() * map.starts.length)];
  const x = start % map.w;
  const y = (start - x) / map.w;
  const ws: WorldState = {
    map,
    rng,
    player: { x, y, fx: x, fy: y, t: 1, moving: false, dir: 'down', dur: WALK_TIME, animT: 0 },
    creatures: [],
    time: 0,
    grace: 1,
    nextUid: 1,
    spawnTimer: 0,
    spotCooldown: map.spots.map(() => 0),
    caught: new Set(caught),
    bumpCooldown: 0,
    steps: 0,
    unlockAll: false,
    signWait: 0,
  };
  for (let k = 0; k < 60 && ws.creatures.length < 10; k++) trySpawn(ws, true);
  return ws;
}

const occupied = (ws: WorldState, x: number, y: number) => ws.creatures.some((c) => c.x === x && c.y === y);

function pickSpecies(ws: WorldState, zone: number): number | null {
  return pickWeighted(ws.rng, speciesForZone(ws.map, zone), (s) => s.rarity)?.id ?? null;
}

/**
 * The mythical creature (#151) only appears once all the other 150 have been caught. Then a
 * single one roams the whole world, anywhere it likes, until it is caught.
 */
export function mythicalUnlocked(caught: Iterable<number>): boolean {
  const have = new Set(caught);
  for (let id = 1; id <= TOTAL; id++) if (id !== MYTHICAL_ID && !have.has(id)) return false;
  return true;
}

/** Cells the mythical can roam to (also used to drop it somewhere new). */
function roamable(ws: WorldState, i: number): boolean {
  const t = ws.map.ter[i];
  return ws.map.reach[i] === 1 && isWalkable(t) && t !== T.STAIRS && t !== T.BRIDGE;
}

function randomFarCell(ws: WorldState, minDist: number): number | null {
  const { map, player: p } = ws;
  for (let k = 0; k < 400; k++) {
    const i = Math.floor(ws.rng() * map.w * map.h);
    const x = i % map.w;
    const y = (i - x) / map.w;
    if (!roamable(ws, i) || Math.abs(x - p.x) + Math.abs(y - p.y) < minDist || occupied(ws, x, y)) continue;
    return i;
  }
  return null;
}

/** May the mythical roam right now? (Not caught yet, and unlocked for real or by the secret code.) */
const mythicalAllowed = (ws: WorldState) => !ws.caught.has(MYTHICAL_ID) && (ws.unlockAll || mythicalUnlocked(ws.caught));

/** Switch the secret unlock on or off; off leaves only what was really earned. */
export function setUnlockAll(ws: WorldState, on: boolean) {
  ws.unlockAll = on;
  ensureMythical(ws);
}

/** Keep exactly one roaming mythical in the world while it's allowed, and none otherwise. */
function ensureMythical(ws: WorldState) {
  if (!mythicalAllowed(ws)) {
    if (ws.creatures.some((c) => c.sp === MYTHICAL_ID)) ws.creatures = ws.creatures.filter((c) => c.sp !== MYTHICAL_ID);
    return;
  }
  if (ws.creatures.some((c) => c.sp === MYTHICAL_ID)) return;
  const i = randomFarCell(ws, 25);
  if (i === null) return;
  const x = i % ws.map.w;
  addCreature(ws, MYTHICAL_ID, x, (i - x) / ws.map.w, -1);
  ws.creatures[ws.creatures.length - 1].shy = false;
}

function addCreature(ws: WorldState, sp: number, x: number, y: number, spot: number) {
  const s = getSpecies(sp);
  ws.creatures.push({
    uid: ws.nextUid++,
    sp,
    x,
    y,
    fx: x,
    fy: y,
    t: 1,
    moving: false,
    dir: ws.rng() < 0.5 ? 'left' : 'right',
    dur: CREATURE_TIME,
    nextMove: 0.5 + ws.rng() * 1.5,
    shy: spot < 0 && ws.rng() < (s.stage >= 2 || s.mythical ? 0.5 : 0.25),
    spot,
  });
}

function trySpawn(ws: WorldState, allowVisible: boolean): boolean {
  const { map, player: p, rng } = ws;
  for (let a = 0; a < 16; a++) {
    const x = p.x + Math.floor(rng() * (SPAWN_RX * 2 + 1)) - SPAWN_RX;
    const y = p.y + Math.floor(rng() * (SPAWN_RY * 2 + 1)) - SPAWN_RY;
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
    const i = y * map.w + x;
    const t = map.ter[i];
    if (!map.reach[i] || !isWalkable(t) || t === T.STAIRS || t === T.BRIDGE) continue;
    const ax = Math.abs(x - p.x);
    const ay = Math.abs(y - p.y);
    if (ax + ay < 5) continue;
    if (!allowVisible && ax <= VIEW_RX && ay <= VIEW_RY) continue;
    if (occupied(ws, x, y)) continue;
    const sp = pickSpecies(ws, map.zone[i]);
    if (!sp) continue;
    addCreature(ws, sp, x, y, -1);
    return true;
  }
  return false;
}

function spawnSpots(ws: WorldState) {
  const p = ws.player;
  ws.map.spots.forEach((s, k) => {
    if (ws.caught.has(s.species) || ws.spotCooldown[k] > 0) return;
    if (ws.creatures.some((c) => c.spot === k)) return;
    if (Math.abs(s.x - p.x) > 24 || Math.abs(s.y - p.y) > 18) return;
    if ((p.x === s.x && p.y === s.y) || (p.fx === s.x && p.fy === s.y)) return;
    if (occupied(ws, s.x, s.y)) return;
    addCreature(ws, s.species, s.x, s.y, k);
  });
}

function despawnFar(ws: WorldState) {
  const p = ws.player;
  ws.creatures = ws.creatures.filter((c) => {
    const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
    return c.spot >= 0 ? d < 46 : c.sp === MYTHICAL_ID || d <= DESPAWN;
  });
}

function creatureCanEnter(ws: WorldState, c: WildCreature, nx: number, ny: number): boolean {
  const { map, player: p } = ws;
  if (!canStep(map, c.x, c.y, nx, ny)) return false;
  const i = ny * map.w + nx;
  const t = map.ter[i];
  if (c.sp !== MYTHICAL_ID) {
    // the mythical goes anywhere; everyone else stays off stairs and bridges, in its own zones
    if (t === T.STAIRS || t === T.BRIDGE) return false;
    if (!zoneInfo(map).allowed.get(c.sp)?.has(map.zone[i])) return false;
  }
  if (p.x === nx && p.y === ny) return false;
  if (p.moving && p.fx === nx && p.fy === ny) return false;
  if (signAt(ws, nx, ny) !== null) return false; // a legendary's sign stands there
  return !occupied(ws, nx, ny);
}

function updateCreatures(ws: WorldState, dt: number) {
  const { rng, player: p } = ws;
  for (const c of ws.creatures) {
    if (c.moving) {
      c.t += dt / c.dur;
      if (c.t >= 1) {
        c.t = 1;
        c.moving = false;
      }
      continue;
    }
    if (c.spot >= 0) continue; // legendaries wait at home
    c.nextMove -= dt;
    if (c.nextMove > 0) continue;
    if (c.sp === MYTHICAL_ID) {
      roam(ws, c);
      continue;
    }
    const dist = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
    const distAfter = (d: Dir) => Math.abs(c.x + DIR_VEC[d][0] - p.x) + Math.abs(c.y + DIR_VEC[d][1] - p.y);
    const dirs = [...ALL_DIRS].sort(() => rng() - 0.5);
    let fleeing = false;
    if (c.shy && dist <= 4 && rng() < 0.85) {
      dirs.sort((a, b) => distAfter(b) - distAfter(a));
      fleeing = true;
    } else if (rng() < 0.35) {
      c.nextMove = 0.5 + rng() * 1.2;
      continue;
    }
    for (const d of dirs) {
      if (fleeing && distAfter(d) < dist) continue;
      const nx = c.x + DIR_VEC[d][0];
      const ny = c.y + DIR_VEC[d][1];
      if (!creatureCanEnter(ws, c, nx, ny)) continue;
      c.fx = c.x;
      c.fy = c.y;
      c.x = nx;
      c.y = ny;
      c.t = 0;
      c.moving = true;
      c.dir = d;
      c.dur = fleeing ? FLEE_TIME : CREATURE_TIME;
      break;
    }
    c.nextMove = fleeing ? 0.12 + rng() * 0.25 : 0.7 + rng() * 1.6;
  }
}

/** Shortest walk from one cell to another (any terrain a creature may step on), or null. */
function findPath(map: WorldMap, from: number, to: number): number[] | null {
  const N = map.w * map.h;
  const prev = new Int32Array(N).fill(-1);
  prev[from] = from;
  const queue = [from];
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q];
    if (c === to) break;
    const cx = c % map.w;
    const cy = (c - cx) / map.w;
    for (const d of ALL_DIRS) {
      const nx = cx + DIR_VEC[d][0];
      const ny = cy + DIR_VEC[d][1];
      if (!canStep(map, cx, cy, nx, ny)) continue;
      const n = ny * map.w + nx;
      if (prev[n] >= 0) continue;
      prev[n] = c;
      queue.push(n);
    }
  }
  if (prev[to] < 0) return null;
  const path: number[] = [];
  for (let c = to; c !== from; c = prev[c]) path.push(c);
  return path.reverse();
}

/** The mythical travels the whole world: it walks to a far-away place, then picks another. */
function roam(ws: WorldState, c: WildCreature) {
  const { map, rng } = ws;
  c.nextMove = 0.45 + rng() * 0.5;
  if (!c.path?.length) {
    const here = c.y * map.w + c.x;
    for (let k = 0; k < 6 && !c.path?.length; k++) {
      const goal = randomFarCell(ws, 0);
      const gx = goal === null ? 0 : goal % map.w;
      const gy = goal === null ? 0 : (goal - gx) / map.w;
      if (goal === null || Math.abs(gx - c.x) + Math.abs(gy - c.y) < 15) continue;
      c.path = findPath(map, here, goal) ?? undefined;
    }
    c.waited = 0;
    if (!c.path?.length) return;
  }
  const next = c.path[0];
  const nx = next % map.w;
  const ny = (next - nx) / map.w;
  const d = ALL_DIRS.find((dd) => c.x + DIR_VEC[dd][0] === nx && c.y + DIR_VEC[dd][1] === ny);
  if (!d || !creatureCanEnter(ws, c, nx, ny)) {
    // someone is in the way: wait a moment, and after a while go somewhere else
    c.nextMove = 0.3;
    if ((c.waited = (c.waited ?? 0) + 1) > 6 || !d) c.path = undefined;
    return;
  }
  c.path.shift();
  c.fx = c.x;
  c.fy = c.y;
  c.x = nx;
  c.y = ny;
  c.t = 0;
  c.moving = true;
  c.dir = d;
  c.dur = CREATURE_TIME;
}

function updatePlayer(ws: WorldState, dt: number, input: WorldInput, ev: WorldEvents) {
  const { map, player: p } = ws;
  if (p.moving) {
    p.t += dt / p.dur;
    p.animT += dt;
    if (p.t < 1) return;
    p.t = 1;
    p.moving = false;
    ws.steps++;
    if (ws.steps % AUTOSAVE_STEPS === 0) ev.autosave = true;
    const i = p.y * map.w + p.x;
    if (map.ter[i] === T.TALL) {
      ev.rustle = true;
      if (ws.grace <= 0 && ws.rng() < GRASS_CHANCE) {
        const sp = pickSpecies(ws, map.zone[i]);
        if (sp) {
          ev.encounter = { sp, uid: null, spot: -1, biome: map.bio[i] };
          return;
        }
      }
    }
  }
  if (!input.dir) {
    p.animT = 0;
    return;
  }
  p.dir = input.dir;
  const nx = p.x + DIR_VEC[input.dir][0];
  const ny = p.y + DIR_VEC[input.dir][1];
  const c = ws.creatures.find((cr) => cr.x === nx && cr.y === ny);
  if (c) {
    ev.encounter = { sp: c.sp, uid: c.uid, spot: c.spot, biome: map.bio[ny * map.w + nx] };
    return;
  }
  const away = signAt(ws, nx, ny);
  if (away !== null) {
    // the legendary went away for a while: read its sign (the player doesn't move)
    if (ws.signWait <= 0) {
      ev.sign = away;
      ws.signWait = 0.8;
    }
    return;
  }
  if (canStep(map, p.x, p.y, nx, ny)) {
    p.fx = p.x;
    p.fy = p.y;
    p.x = nx;
    p.y = ny;
    p.t = 0;
    p.moving = true;
    p.dur = input.run ? RUN_TIME : WALK_TIME;
  } else if (ws.bumpCooldown <= 0) {
    ev.bump = true;
    ws.bumpCooldown = 0.35;
  }
}

export function updateWorld(ws: WorldState, dtRaw: number, input: WorldInput): WorldEvents {
  const dt = Math.min(dtRaw, 0.05);
  const ev: WorldEvents = { encounter: null, bump: false, rustle: false, autosave: false, sign: null };
  ws.time += dt;
  ws.signWait = Math.max(0, ws.signWait - dt);
  ws.grace = Math.max(0, ws.grace - dt);
  ws.bumpCooldown -= dt;
  for (let k = 0; k < ws.spotCooldown.length; k++) ws.spotCooldown[k] = Math.max(0, ws.spotCooldown[k] - dt);
  updatePlayer(ws, dt, input, ev);
  if (ev.encounter) return ev;
  updateCreatures(ws, dt);
  ws.spawnTimer -= dt;
  if (ws.spawnTimer <= 0) {
    ws.spawnTimer = 0.45;
    despawnFar(ws);
    if (ws.creatures.filter((c) => c.spot < 0 && c.sp !== MYTHICAL_ID).length < MAX_CREATURES) trySpawn(ws, false);
    spawnSpots(ws);
    ensureMythical(ws);
  }
  return ev;
}

export type Outcome = 'caught' | 'fled' | 'ran' | 'lost';

/** Clean up after a battle: the met creature leaves the map either way. */
export function finishEncounter(ws: WorldState, enc: Encounter, outcome: Outcome) {
  if (enc.uid !== null) ws.creatures = ws.creatures.filter((c) => c.uid !== enc.uid);
  if (enc.spot >= 0 && outcome !== 'caught') ws.spotCooldown[enc.spot] = 25;
  if (outcome === 'caught') ws.caught.add(enc.sp);
  ws.grace = 1.5;
}

export function biomeOfPlayer(ws: WorldState): number {
  return ws.map.bio[ws.player.y * ws.map.w + ws.player.x] ?? B.PRADERA;
}

/** The zone (habitat area or city district) the player stands in. */
export function zoneOfPlayer(ws: WorldState): number {
  return ws.map.zone[ws.player.y * ws.map.w + ws.player.x] ?? 0;
}

// ------------------------------------------------------------ saving

/** Everything needed to continue exactly where the player was. */
export interface WorldSnapshot {
  v: 1;
  map: string;
  steps: number;
  time: number;
  grace: number;
  nextUid: number;
  spawnTimer: number;
  rng: number;
  player: { x: number; y: number; dir: Dir };
  creatures: { uid: number; sp: number; x: number; y: number; dir: Dir; shy: boolean; spot: number; nextMove: number }[];
  spotCooldown: number[];
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function snapshotWorld(ws: WorldState): WorldSnapshot {
  const p = ws.player;
  return {
    v: 1,
    map: ws.map.id,
    steps: ws.steps,
    time: r3(ws.time),
    grace: r3(ws.grace),
    nextUid: ws.nextUid,
    spawnTimer: r3(ws.spawnTimer),
    rng: ws.rng.getState(),
    player: { x: p.x, y: p.y, dir: p.dir },
    creatures: ws.creatures.map((c) => ({ uid: c.uid, sp: c.sp, x: c.x, y: c.y, dir: c.dir, shy: c.shy, spot: c.spot, nextMove: r3(c.nextMove) })),
    spotCooldown: ws.spotCooldown.map(r3),
  };
}

const isDir = (d: unknown): d is Dir => d === 'up' || d === 'down' || d === 'left' || d === 'right';
const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Rebuild a saved world. Returns null when the data doesn't fit this world. */
export function restoreWorld(map: WorldMap, data: unknown, caught: number[]): WorldState | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<WorldSnapshot>;
  if (d.v !== 1 || d.map !== map.id || !d.player) return null;
  const okCell = (x: unknown, y: unknown): boolean =>
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    (x as number) >= 0 &&
    (y as number) >= 0 &&
    (x as number) < map.w &&
    (y as number) < map.h &&
    isWalkable(map.ter[(y as number) * map.w + (x as number)]) &&
    map.reach[(y as number) * map.w + (x as number)] === 1;
  const { x, y } = d.player;
  if (!okCell(x, y)) return null;

  const caughtSet = new Set(caught);
  const used = new Set<number>([y * map.w + x]);
  const creatures: WildCreature[] = [];
  for (const c of Array.isArray(d.creatures) ? d.creatures : []) {
    if (!c || !okCell(c.x, c.y) || !Number.isInteger(c.sp) || c.sp < 1 || c.sp > TOTAL) continue;
    const cell = c.y * map.w + c.x;
    if (used.has(cell)) continue;
    const spot = Number.isInteger(c.spot) && c.spot >= 0 && c.spot < map.spots.length && map.spots[c.spot].species === c.sp ? c.spot : -1;
    if (spot >= 0 && caughtSet.has(c.sp)) continue;
    used.add(cell);
    creatures.push({
      uid: Number.isInteger(c.uid) ? c.uid : 0,
      sp: c.sp,
      x: c.x,
      y: c.y,
      fx: c.x,
      fy: c.y,
      t: 1,
      moving: false,
      dir: isDir(c.dir) ? c.dir : 'left',
      dur: CREATURE_TIME,
      nextMove: clamp(num(c.nextMove, 1), 0, 5),
      shy: !!c.shy,
      spot,
    });
  }
  let nextUid = Math.max(1, Math.floor(num(d.nextUid, 1)));
  const uids = new Set<number>();
  for (const c of creatures) {
    if (c.uid < 1 || uids.has(c.uid)) c.uid = nextUid++;
    uids.add(c.uid);
    nextUid = Math.max(nextUid, c.uid + 1);
  }
  return {
    map,
    rng: mulberry32(Number.isInteger(d.rng) ? (d.rng as number) : Date.now()),
    player: { x, y, fx: x, fy: y, t: 1, moving: false, dir: isDir(d.player.dir) ? d.player.dir : 'down', dur: WALK_TIME, animT: 0 },
    creatures,
    time: Math.max(0, num(d.time, 0)),
    grace: clamp(num(d.grace, 0), 0, 2),
    nextUid,
    spawnTimer: clamp(num(d.spawnTimer, 0), 0, 1),
    spotCooldown: map.spots.map((_, k) => clamp(num(d.spotCooldown?.[k], 0), 0, 60)),
    caught: caughtSet,
    bumpCooldown: 0,
    steps: Math.max(0, Math.floor(num(d.steps, 0))),
    unlockAll: false,
    signWait: 0,
  };
}
