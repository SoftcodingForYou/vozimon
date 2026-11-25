// Signature attack animations: every one of the 151 attacks has its own recipe, built from a
// small vocabulary of motions and particle shapes. The colours and sound family still follow
// the attack's type, so children keep recognising the types (and learn the type chart).
// Pure data (no DOM): the effects are drawn by components/AttackFx.tsx.

import { getSpecies } from './creatures';

/** How the attack moves across the battle field. */
export type Motion =
  | 'shot' // particles fly straight at the target
  | 'stream' // a continuous stream (breath, jet, blizzard)
  | 'arc' // lobbed in an arc
  | 'spiral' // particles circle while they travel
  | 'rain' // falling onto the target from above
  | 'rise' // springing up from the ground under the target
  | 'meteor' // one big thing crashing down from the sky, with a trail
  | 'float' // drifting gently, wobbling
  | 'cloud' // puffs that grow while they drift over
  | 'dash' // a fast charge with after-images
  | 'punch' // a big fist / foot / horn flying in
  | 'stomp' // something heavy dropping on the target, with dust
  | 'burst' // exploding outwards on the target
  | 'orbit' // circling the target, then closing in
  | 'dig' // a mound travelling underground, popping up under the target
  | 'beam' // a ray from attacker to target
  | 'wave' // one big wave rolling over
  | 'whirl' // a whirlwind travelling over
  | 'ring' // rings (sound, roars) spreading towards the target
  | 'shield' // a shield forms around the attacker, then a pulse hits
  | 'wrap' // coils closing around the target
  | 'slash' // claw / whip marks on the target
  | 'bite' // jaws snapping shut on the target
  | 'bolt' // lightning from the sky
  | 'flash' // a flash of light across the field
  | 'quake'; // the ground cracks under the target

/** The little picture each particle shows (see components/fxParticles.tsx). */
export type Particle =
  | 'flame' | 'fireball' | 'ember' | 'lava' | 'bubble' | 'drop' | 'wave' | 'leaf' | 'petal' | 'seed'
  | 'spore' | 'thorn' | 'vine' | 'root' | 'spark' | 'bolt' | 'snow' | 'shard' | 'iceball' | 'rock'
  | 'pebble' | 'dust' | 'feather' | 'wind' | 'star' | 'heart' | 'note' | 'zzz' | 'shadow' | 'eye'
  | 'ink' | 'pearl' | 'acorn' | 'bamboo' | 'shell' | 'cloud' | 'nectar' | 'prism' | 'rainbow' | 'fist'
  | 'foot' | 'glove' | 'horn' | 'claw' | 'jaw' | 'pincer' | 'hex' | 'beak' | 'fin' | 'sound'
  | 'boo' | 'moon' | 'comet' | 'chili' | 'banana' | 'paw' | 'wheel' | 'spikeball' | 'pumpkin'
  | 'confetti' | 'bell' | 'branch' | 'tentacle' | 'swirl';

export interface AttackRecipe {
  motion: Motion;
  particle: Particle;
  count: number;
  size: number; // 1 = normal; evolutions grow
  colors: [string, string]; // main colour, light accent
  word?: string; // comic word on the hit ("¡ZAS!")
  shake?: boolean; // shake the screen on the hit
}

// Colour pairs (main, accent), mostly the type's colours.
const FIRE: [string, string] = ['#ff8a26', '#ffe070'];
const LAVA: [string, string] = ['#e8501c', '#ffcf4a'];
const DRAGON: [string, string] = ['#7a52ec', '#e6d8ff'];
const WATER: [string, string] = ['#3f8ef0', '#cfeaff'];
const SEA: [string, string] = ['#2a62c8', '#9ad4ff'];
const LEAF: [string, string] = ['#4fb648', '#d2f4a8'];
const FLOWER: [string, string] = ['#f890c0', '#fff0f6'];
const BUG: [string, string] = ['#97ba24', '#eef8b0'];
const AIR: [string, string] = ['#f4f8ff', '#8aa6f2'];
const NORMAL: [string, string] = ['#e2d4b0', '#fffaf0'];
const ELEC: [string, string] = ['#f8d838', '#fffbe0'];
const ICE: [string, string] = ['#8adcf8', '#ffffff'];
const ROCK: [string, string] = ['#a57b4b', '#e4c89e'];
const GHOST: [string, string] = ['#6a4aa8', '#dcc8ff'];
const FIGHT: [string, string] = ['#ffd2a6', '#c66a3a'];
const MAGIC: [string, string] = ['#f07fc0', '#ffe27a'];
const INK: [string, string] = ['#2a2238', '#6e6e90'];
const MUD: [string, string] = ['#8a5a32', '#d0a070'];
const GOLD: [string, string] = ['#f8c838', '#fff6c0'];
const WHITE: [string, string] = ['#ffffff', '#c8d4e8'];

const R = (motion: Motion, particle: Particle, count: number, size: number, colors: [string, string], extra: Partial<AttackRecipe> = {}): AttackRecipe => ({
  motion,
  particle,
  count,
  size,
  colors,
  ...extra,
});

/** Every attack's recipe, by attack name (each Vozimón has its own attack). */
export const ATTACKS: Record<string, AttackRecipe> = {
  'Bola de fuego': R('arc', 'fireball', 1, 1.5, FIRE),
  Llamarada: R('stream', 'flame', 12, 1.1, FIRE),
  'Erupción': R('rain', 'lava', 7, 1.3, LAVA, { shake: true }),
  'Lluvia de burbujas': R('float', 'bubble', 8, 0.9, WATER),
  'Chorro de agua': R('beam', 'drop', 6, 1, WATER),
  'Ola gigante': R('wave', 'wave', 5, 1.4, SEA, { shake: true }),
  'Hoja cortante': R('shot', 'leaf', 6, 1, LEAF),
  'Látigo de ramas': R('slash', 'vine', 2, 1.1, LEAF, { word: '¡ZAS!' }),
  'Tormenta de flores': R('whirl', 'petal', 12, 1, FLOWER, { shake: true }),
  Mordisquito: R('bite', 'jaw', 1, 0.8, BUG),
  Coraza: R('shield', 'hex', 6, 1, BUG),
  'Polvo brillante': R('cloud', 'spark', 9, 0.9, GOLD),
  'Pico rápido': R('dash', 'beak', 3, 1, ['#f59a34', '#ffe0a0']),
  Aleteo: R('shot', 'wind', 4, 1.1, AIR),
  'Huracán': R('whirl', 'wind', 8, 1.4, AIR, { shake: true }),
  'Ataque moflete': R('shot', 'seed', 7, 0.8, ['#c8a050', '#f8e8b0']),
  Panzazo: R('stomp', 'dust', 1, 1.3, NORMAL, { word: '¡PLAF!' }),
  Chispita: R('shot', 'spark', 5, 0.9, ELEC),
  'Rayo veloz': R('bolt', 'spark', 1, 1, ELEC),
  Enredadera: R('wrap', 'vine', 2, 1, LEAF),
  'Abrazo de lianas': R('wrap', 'leaf', 3, 1.3, LEAF),
  Pellizco: R('burst', 'pincer', 4, 0.8, BUG),
  'Mandíbula de piedra': R('bite', 'rock', 1, 1.3, ROCK, { shake: true }),
  Excavar: R('dig', 'pebble', 6, 1, ROCK),
  Temblor: R('quake', 'rock', 6, 1.2, ROCK, { shake: true }),
  'Polvo de estrellas': R('spiral', 'star', 8, 0.9, MAGIC),
  'Destello mágico': R('flash', 'spark', 8, 1.1, MAGIC),
  Zarpita: R('slash', 'claw', 1, 0.8, NORMAL),
  Zarpazo: R('slash', 'claw', 3, 1.2, NORMAL, { word: '¡ZAS!' }),
  'Placaje de roca': R('dash', 'rock', 3, 1.1, ROCK),
  Lanzarrocas: R('arc', 'rock', 3, 1.1, ROCK),
  'Puño de montaña': R('punch', 'fist', 1, 1.5, ROCK, { word: '¡PAM!', shake: true }),
  Lucecita: R('float', 'ember', 6, 0.8, GOLD),
  'Destello ardiente': R('flash', 'flame', 8, 1.1, FIRE),
  'Salpicón': R('burst', 'drop', 8, 0.9, WATER),
  'Patada de rana': R('punch', 'foot', 1, 1.2, ['#7ac850', '#2f6a28'], { word: '¡ZAS!' }),
  Remolino: R('whirl', 'drop', 9, 1, WATER),
  'Ala acuática': R('dash', 'feather', 3, 1.1, WATER),
  Esporas: R('shot', 'spore', 6, 0.9, ['#8ccc50', '#f0f8c8']),
  'Nube de esporas': R('cloud', 'spore', 8, 1.2, ['#a070d0', '#efe0ff']),
  Chillido: R('ring', 'sound', 3, 1, GHOST),
  'Ala sombría': R('slash', 'feather', 2, 1.2, GHOST),
  'Lava pegajosa': R('arc', 'lava', 2, 1.2, LAVA),
  'Volcán andante': R('rise', 'lava', 6, 1.3, LAVA, { shake: true }),
  Coletazo: R('slash', 'fin', 1, 1.1, WATER, { word: '¡PLAS!' }),
  Torbellino: R('whirl', 'bubble', 10, 1.2, SEA, { shake: true }),
  Pinza: R('bite', 'pincer', 1, 1, ['#e8603c', '#ffd0b0']),
  'Gran pinza': R('bite', 'pincer', 2, 1.4, ['#c83c2c', '#ffc0a0'], { word: '¡CRAC!', shake: true }),
  'Chorro de tinta': R('beam', 'ink', 5, 1, INK),
  'Tentáculos': R('wrap', 'tentacle', 3, 1.1, ['#d070b0', '#ffd8f0']),
  Calambre: R('burst', 'spark', 8, 0.9, ['#f8d838', '#9ad4ff']),
  'Descarga marina': R('beam', 'bolt', 5, 1.1, ['#f8d838', '#3f8ef0'], { shake: true }),
  'Bola de nieve': R('arc', 'iceball', 1, 1.3, WHITE),
  Ventisca: R('stream', 'snow', 12, 1, ICE),
  'Picotazo helado': R('dash', 'shard', 3, 1, ICE),
  'Rayo de escarcha': R('beam', 'shard', 6, 1.2, ICE, { shake: true }),
  'Copos de nieve': R('float', 'snow', 7, 0.9, ICE),
  Alud: R('wave', 'snow', 6, 1.4, WHITE, { shake: true }),
  'Puño helado': R('punch', 'fist', 1, 1.2, ICE, { word: '¡PAM!' }),
  Avalancha: R('rain', 'iceball', 6, 1.4, WHITE, { shake: true }),
  Susto: R('burst', 'boo', 3, 0.9, GHOST, { word: '¡BU!' }),
  'Bu-bu': R('float', 'boo', 4, 1.1, GHOST, { word: '¡BU-BU!' }),
  'Gran susto': R('rise', 'boo', 1, 2.6, GHOST, { word: '¡BUUU!', shake: true }),
  'Bola sombra': R('shot', 'shadow', 3, 1.3, GHOST),
  'Noche oscura': R('flash', 'moon', 4, 1.2, ['#2a1e4a', '#f8e8a0'], { shake: true }),
  'Aliento de dragón': R('stream', 'flame', 12, 1.1, DRAGON),
  'Garra de dragón': R('slash', 'claw', 3, 1.3, DRAGON, { word: '¡ZAS!' }),
  'Cometa dragón': R('meteor', 'comet', 5, 2.2, DRAGON, { shake: true }),
  'Rayo arcoíris': R('beam', 'rainbow', 5, 1.1, MAGIC),
  'Galope estelar': R('dash', 'star', 4, 1.2, MAGIC),
  Destello: R('flash', 'spark', 6, 1, ELEC),
  Megavatio: R('bolt', 'bolt', 3, 1.3, ELEC, { shake: true }),
  'Chispazo acuático': R('shot', 'bubble', 6, 1, ['#f8d838', '#3f8ef0']),
  'Trueno marino': R('bolt', 'drop', 2, 1.2, ['#f8d838', '#3f8ef0'], { shake: true }),
  'Raíz fuerte': R('rise', 'root', 3, 1, ['#8a5a32', '#c8e070']),
  'Lluvia de semillas': R('rain', 'seed', 9, 0.9, ['#8a6a32', '#d8f0a0']),
  Pinchitos: R('shot', 'thorn', 8, 0.8, LEAF),
  'Puño espinoso': R('punch', 'fist', 1, 1.3, LEAF, { word: '¡PINCH!' }),
  'Pétalos': R('shot', 'petal', 7, 0.9, FLOWER),
  'Danza de pétalos': R('orbit', 'petal', 10, 1.1, FLOWER),
  Ramazo: R('stomp', 'branch', 1, 1.6, ['#8a5a32', '#4fb648'], { word: '¡PAF!' }),
  'Raíces gigantes': R('wrap', 'root', 3, 1.4, ['#8a5a32', '#c8a070'], { shake: true }),
  'Puñetazo': R('punch', 'fist', 1, 1.1, FIGHT, { word: '¡PUM!' }),
  'Gancho campeón': R('punch', 'glove', 1, 1.5, ['#e43c3c', '#ffd0c8'], { word: '¡ZAS!', shake: true }),
  'Golpe travieso': R('arc', 'banana', 2, 1, ['#f8d838', '#8a6a32']),
  'Golpe de liana': R('dash', 'vine', 3, 1.2, LEAF, { word: '¡ZAS!' }),
  Topetazo: R('dash', 'horn', 3, 1, ['#e8e0d0', '#a08060']),
  Embestida: R('dash', 'dust', 4, 1.4, ROCK, { word: '¡BUM!', shake: true }),
  'Bola rodante': R('dash', 'wheel', 3, 1.1, ['#a08070', '#e0c8b0']),
  Rodillo: R('arc', 'wheel', 1, 1.8, ['#8a6a5a', '#d8c0a8'], { shake: true }),
  'Mordisco jurásico': R('bite', 'jaw', 1, 1.2, ['#6aa850', '#f0f0e0']),
  'Rugido prehistórico': R('ring', 'rock', 4, 1.3, ['#6aa850', '#e0c89e'], { shake: true }),
  Brillo: R('burst', 'prism', 6, 0.9, ['#b8a0f8', '#ffffff']),
  Prisma: R('beam', 'prism', 5, 1.2, ['#b8a0f8', '#ffffff']),
  Picado: R('meteor', 'feather', 4, 1.6, AIR),
  'Garra del cielo': R('slash', 'claw', 2, 1.2, ['#8aa6f2', '#ffffff']),
  Llovizna: R('rain', 'drop', 10, 0.7, WATER),
  Tormenta: R('bolt', 'cloud', 2, 1.2, ['#8a8ea8', '#f8d838'], { shake: true }),
  'Abrazo de oso': R('wrap', 'heart', 3, 1, ['#a0704a', '#f890c0']),
  'Zarpazo de oso': R('slash', 'paw', 3, 1.4, ['#8a5a32', '#e8c8a0'], { word: '¡ZAS!', shake: true }),
  'Mirada fija': R('ring', 'eye', 3, 1, ['#f8c838', '#ffffff']),
  Hipnosis: R('orbit', 'swirl', 6, 1.1, ['#b06ae0', '#f0d8ff']),
  Travesura: R('burst', 'confetti', 12, 0.8, ['#f8d838', '#f07fc0']),
  'Golpe pícaro': R('punch', 'paw', 2, 1.1, ['#8a8a96', '#e8e8f0']),
  'Pío pío': R('float', 'note', 5, 0.8, ['#f8d838', '#fff6c0']),
  'Kikirikí': R('ring', 'note', 3, 1.2, ['#e8603c', '#ffe070'], { word: '¡KIKIRIKÍ!' }),
  'Lengua de fuego': R('beam', 'flame', 6, 1, FIRE),
  'Llama dragón': R('whirl', 'flame', 10, 1.2, ['#ff8a26', '#c8a8ff'], { shake: true }),
  Picante: R('shot', 'chili', 4, 0.9, ['#e8302c', '#4fb648']),
  'Súper picante': R('burst', 'chili', 8, 1.2, ['#e8302c', '#4fb648'], { word: '¡AY!', shake: true }),
  'Escudo de concha': R('shield', 'shell', 6, 1, ['#e8b088', '#fff0e0']),
  'Ola de roca': R('wave', 'rock', 5, 1.3, ROCK, { shake: true }),
  'Perla brillante': R('arc', 'pearl', 1, 1.2, ['#f8f8ff', '#f8c8e8']),
  'Cierre de concha': R('bite', 'shell', 1, 1.3, ['#8a96b8', '#e8ecf8'], { word: '¡CLAC!' }),
  Chorro: R('rise', 'drop', 7, 1, WATER),
  'Gran ola': R('wave', 'drop', 6, 1.6, SEA, { shake: true }),
  'Garra helada': R('slash', 'shard', 3, 1.1, ICE),
  'Abrazo polar': R('wrap', 'snow', 3, 1.3, WHITE),
  Saltito: R('stomp', 'foot', 1, 1, FIGHT),
  'Doble patada': R('punch', 'foot', 2, 1.2, ['#c8a070', '#5a3a20'], { word: '¡PAM PAM!' }),
  'Vuelo rápido': R('dash', 'wind', 4, 1, BUG),
  Mugido: R('ring', 'bell', 3, 1.1, ['#f8c838', '#8a6a32'], { word: '¡MUUU!' }),
  'Revolcón': R('burst', 'ink', 7, 1, MUD),
  Bostezo: R('float', 'zzz', 4, 1, ['#8aa6f2', '#ffffff']),
  Lanzabellotas: R('shot', 'acorn', 4, 1, ['#c88a4a', '#7a522e']),
  'Bola de pinchos': R('dash', 'spikeball', 3, 1.1, ['#8a7060', '#e8d8c8']),
  'Picada marina': R('meteor', 'drop', 4, 1.6, SEA),
  'Néctar veloz': R('shot', 'nectar', 5, 0.9, GOLD),
  Recarga: R('orbit', 'spark', 8, 1, ELEC),
  'Rayo frío': R('beam', 'snow', 6, 1, ICE),
  Niebla: R('cloud', 'cloud', 7, 1.3, ['#c8c8dc', '#f4f4ff']),
  'Giro estelar': R('whirl', 'star', 9, 1, ['#f8a838', '#ffe27a']),
  Pellizquito: R('slash', 'pincer', 2, 0.8, ['#f07858', '#ffd8c8']),
  'Salto acrobático': R('stomp', 'wave', 1, 1.4, WATER, { word: '¡CHAPUZÓN!' }),
  Dulzura: R('float', 'heart', 6, 0.9, ['#f07fc0', '#ffe0f0']),
  Rodar: R('dash', 'pumpkin', 3, 1.2, ['#4fb648', '#c8f0a0']),
  'Pompas de jabón': R('spiral', 'bubble', 8, 1, ['#d8c0ff', '#ffffff']),
  'Arcoíris': R('wave', 'rainbow', 4, 1.4, MAGIC),
  'Golpe de bambú': R('stomp', 'bamboo', 1, 1.5, ['#7ac850', '#2f6a28'], { word: '¡PAM!' }),
  'Lana suave': R('float', 'cloud', 5, 1.1, WHITE),
  Cuernazo: R('punch', 'horn', 1, 1.5, ['#c8c0b0', '#7a6a5a'], { word: '¡BUM!', shake: true }),
  'Concha voladora': R('shot', 'shell', 3, 1.1, ['#e8b088', '#fff0e0']),
  Siesta: R('orbit', 'zzz', 5, 1, ['#8aa6f2', '#ffffff']),
  'Mordisco marino': R('bite', 'jaw', 2, 1.3, ['#5a7ab8', '#ffffff'], { shake: true }),
  'Trueno real': R('bolt', 'star', 3, 1.5, GOLD, { shake: true }),
  'Ventisca eterna': R('whirl', 'snow', 12, 1.6, ICE, { shake: true }),
  'Fuego volcánico': R('meteor', 'fireball', 5, 2.4, LAVA, { shake: true }),
  Maremoto: R('wave', 'wave', 7, 2, ['#2a52b0', '#c8b8ff'], { shake: true }),
  'Raíz sagrada': R('rise', 'root', 5, 1.5, ['#c8a040', '#ffe27a'], { shake: true }),
  Aurora: R('flash', 'rainbow', 6, 1.4, ['#8adcd0', '#f0b8ff'], { shake: true }),
  Deseo: R('meteor', 'star', 6, 2, GOLD, { word: '¡DESEO!', shake: true }),
};

/** The recipe of a creature's attack. */
export function attackRecipe(sp: number): AttackRecipe {
  const s = getSpecies(sp);
  return ATTACKS[s.attack] ?? R('shot', 'spark', 5, 1, ['#ffffff', '#cccccc']);
}

/** Milliseconds from the start of each motion until it hits the target. */
const HIT: Record<Motion, number> = {
  shot: 480,
  stream: 460,
  arc: 640,
  spiral: 640,
  rain: 520,
  rise: 400,
  meteor: 620,
  float: 820,
  cloud: 760,
  dash: 420,
  punch: 340,
  stomp: 380,
  burst: 340,
  orbit: 700,
  dig: 700,
  beam: 320,
  wave: 680,
  whirl: 720,
  ring: 520,
  shield: 640,
  wrap: 460,
  slash: 260,
  bite: 360,
  bolt: 280,
  flash: 340,
  quake: 300,
};

export const attackHitDelay = (r: AttackRecipe) => HIT[r.motion];

/** How long the whole effect lasts (the hit, then the impact fading out). */
export const attackDuration = (r: AttackRecipe) => HIT[r.motion] + 520;
