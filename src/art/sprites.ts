// Small hand-drawn sprites: generic overworld creatures, the player and the star ball.

import { fromStrings, flipH, mirrorRows } from './pixel';
import { darken, hexToRgb, lighten, mix, type PixelImage } from './raster';
import type { OwKind } from '../game/creatures';

// ------------------------------------------------------ generic overworld creatures

const LAND = mirrorRows([
  '........',
  '........',
  '...oo...',
  '..obbo..',
  '..obpbo.',
  '..obbbbo',
  '.obbbbbb',
  '.obbbbbb',
  'obbbewbb',
  'obbbeebb',
  'obpbbbbd',
  'obbbllll',
  '.obbllll',
  '..obbbbb',
  '..obbo..',
  '...oo...',
]);

const WATER = mirrorRows([
  '........',
  '........',
  '........',
  '.....ooo',
  '....obbb',
  '...obbbb',
  '...obewb',
  '...obeeb',
  '..oobbbd',
  '.obobbll',
  'obbobbll',
  '.ooobbll',
  '....obll',
  '...obbbb',
  '..obbo..',
  '..ooo...',
]);

const BUG = mirrorRows([
  '........',
  '........',
  '....o...',
  '.....o..',
  '......oo',
  '.....okk',
  '....okwk',
  '...oookk',
  '..obbbbo',
  '.obdbbbo',
  'oobbbbbo',
  '.obbdbbo',
  'oobbbbbo',
  '..obbbbo',
  '...ooooo',
  '........',
]);

const GHOST = mirrorRows([
  '........',
  '........',
  '.....ooo',
  '....obbb',
  '...obbbb',
  '...obbbb',
  '..obbewb',
  '..obbeeb',
  '..obpbbb',
  '.obbbbbd',
  '.obbbbbb',
  '..obbbbb',
  '..obbbbb',
  '..obbbbb',
  '..obo.ob',
  '...o...o',
]);

const PLANT = mirrorRows([
  '........',
  '....oo..',
  '...oggo.',
  '...ogggo',
  '....oggG',
  '.....ooG',
  '....oobb',
  '...obbbb',
  '..obbewb',
  '..obbeeb',
  '..obpbbd',
  '..obbbbb',
  '...obbll',
  '....obbb',
  '....obo.',
  '.....o..',
]);

const BIRD_UP = [
  '................',
  '................',
  '..........oo....',
  '.........oddo...',
  '....oooo.oddo...',
  '...obbbbooddo...',
  '..obbbbbbodo....',
  '.oobewbbbbbo....',
  'oyybeebbbbbboo..',
  '.oobbbbbbbbbbbo.',
  '..obllllbbbbbboo',
  '..obllllbbbbbo..',
  '...obllbbbbbo...',
  '....oobbbboo....',
  '.....oyo.oyo....',
  '....oyyo.oyyo...',
];

const BIRD_DOWN = [
  '................',
  '................',
  '................',
  '................',
  '....oooo........',
  '...obbbbo.......',
  '..obbbbbbo......',
  '.oobewbbbbo.....',
  'oyybeebbbbboo...',
  '.oobbbbddddbbo..',
  '..obllbddddbbboo',
  '..obllbbdddbbo..',
  '...obllbbbbbo...',
  '....oobbbboo....',
  '.....oyo.oyo....',
  '....oyyo.oyyo...',
];

const OW_ART: Record<OwKind, string[][]> = {
  land: [LAND],
  water: [WATER],
  bug: [BUG],
  ghost: [GHOST],
  plant: [PLANT],
  bird: [BIRD_DOWN, BIRD_UP],
};

/**
 * One fixed look per kind: in the world all creatures of a kind look exactly the same, so
 * children can't tell which Vozimón it is until they meet it.
 */
export const OW_COLORS: Record<OwKind, [string, string]> = {
  land: ['#c89a62', '#f4e2c0'],
  bird: ['#9a7a5a', '#f0e0c8'],
  water: ['#4a8ae0', '#cfe6ff'],
  bug: ['#8ab83a', '#e8f4b0'],
  ghost: ['#b8a8e0', '#f4eeff'],
  plant: ['#5ab04a', '#e0f4c0'],
};

/** Frames (facing left) for a generic overworld creature of a kind. */
export function overworldFrames(kind: OwKind): PixelImage[] {
  const [body, light] = OW_COLORS[kind];
  const pal = {
    o: mix(body, '#140c1c', 0.78),
    b: body,
    d: darken(body, 0.28),
    l: light,
    e: '#181018',
    w: '#ffffff',
    y: '#f59a34',
    p: '#f69ab0',
    k: mix(body, '#140c1c', 0.6),
    g: '#5cc24a',
    G: '#2f8a3c',
  };
  return OW_ART[kind].map((rows) => fromStrings(rows, pal));
}

// --------------------------------------------------------------------- player

export interface Avatar {
  style: 'cap' | 'bow';
  name: string;
  skin: string;
  hair: string;
  hat: string;
  shirt: string;
  pants: string;
}

export const AVATARS: Avatar[] = [
  { style: 'cap', name: 'Rojo', skin: '#f8d0a8', hair: '#6a3a1a', hat: '#e43c3c', shirt: '#3a72e0', pants: '#3a4268' },
  { style: 'bow', name: 'Rosa', skin: '#e8b088', hair: '#4a2414', hat: '#f8649a', shirt: '#f88ab4', pants: '#5a3a7a' },
  { style: 'cap', name: 'Verde', skin: '#b87a4a', hair: '#1e1a22', hat: '#3aa84a', shirt: '#f8c838', pants: '#4a3a2a' },
  { style: 'bow', name: 'Lila', skin: '#f8dcc0', hair: '#e8b440', hat: '#9a5ae0', shirt: '#b68af2', pants: '#3a4268' },
  { style: 'cap', name: 'Azul', skin: '#e8b088', hair: '#e8b440', hat: '#2a8ae8', shirt: '#f86a3a', pants: '#2a3a5a' },
  { style: 'bow', name: 'Naranja', skin: '#8a5a3a', hair: '#1e1a22', hat: '#f89a2a', shirt: '#3ac0a0', pants: '#3a2a4a' },
];

const CAP_DOWN = mirrorRows(['....oooo', '...occcc', '..occccc', '..oCCCCC', '..ohssss', '..osskss', '..osskss', '...ossss', '....ooss', '...otttt', '..ostttt', '..ostttt']);
const CAP_UP = mirrorRows(['....oooo', '...occcc', '..occccc', '..occccc', '..ohhhhh', '..ohhhhh', '..ohhhhh', '...ohhhh', '....ooss', '...otttt', '..ostttt', '..ostttt']);
const CAP_LEFT = [
  '.....ooooooo....',
  '....occcccccco..',
  '...occcccccccco.',
  '.oCCCCCcccccco..',
  '...osssssshhho..',
  '...oskssssshho..',
  '...oskssssshho..',
  '....ossssssho...',
  '.....ossssoo....',
  '.....ottttto....',
  '.....otstttto...',
  '.....otstttto...',
];
const BOW_DOWN = mirrorRows(['....occo', '...ohhoc', '..ohhhhh', '..ohhhhh', '.ohhssss', '.ohsskss', '.ohsskss', '.ohhssss', '.ohhooss', '..ootttt', '..ostttt', '..ostttt']);
const BOW_UP = mirrorRows(['....occo', '...ohhoc', '..ohhhhh', '..ohhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhhhhh', '.ohhooss', '..ootttt', '..ostttt', '..ostttt']);
const BOW_LEFT = [
  '.....ooooooo....',
  '....ohhhhhhhoco.',
  '...ohhhhhhhhhoc.',
  '...ohhhhhhhhhho.',
  '...osssssshhhho.',
  '...oskssssshhho.',
  '...oskssssshhho.',
  '....osssssshhho.',
  '.....ossssoohho.',
  '.....ottttto....',
  '.....otstttto...',
  '.....otstttto...',
];

const LEGS_FRONT = {
  stand: ['...oppppppppo...', '...oppo..oppo...', '...obbo..obbo...', '....oo....oo....'],
  walk: ['...oppppppppo...', '...oppo..obbo...', '...obbo...oo....', '....oo..........'],
};
const LEGS_SIDE = {
  stand: ['.....oppppppo...', '.....oppppo.....', '....obbbbbo.....', '.....ooooo......'],
  walk: ['.....oppppppo...', '....oppo.oppo...', '...obbo...obbo..', '....oo.....oo...'],
};

export type Dir = 'down' | 'up' | 'left' | 'right';

/** Player frames per direction: [stand, step A, stand, step B]. */
export function playerFrames(av: Avatar): Record<Dir, PixelImage[]> {
  const pal = {
    o: '#241c2c',
    s: av.skin,
    S: darken(av.skin, 0.2),
    k: '#1c1424',
    h: av.hair,
    H: darken(av.hair, 0.25),
    c: av.hat,
    C: darken(av.hat, 0.3),
    t: av.shirt,
    T: darken(av.shirt, 0.25),
    p: av.pants,
    P: darken(av.pants, 0.25),
    b: '#4a2a2a',
    w: '#ffffff',
  };
  const front = av.style === 'cap' ? CAP_DOWN : BOW_DOWN;
  const back = av.style === 'cap' ? CAP_UP : BOW_UP;
  const side = av.style === 'cap' ? CAP_LEFT : BOW_LEFT;
  const mk = (top: string[], legs: string[]) => fromStrings([...top, ...legs], pal);
  const downStand = mk(front, LEGS_FRONT.stand);
  const downWalk = mk(front, LEGS_FRONT.walk);
  const upStand = mk(back, LEGS_FRONT.stand);
  const upWalk = mk(back, LEGS_FRONT.walk);
  const leftStand = mk(side, LEGS_SIDE.stand);
  const leftWalk = mk(side, LEGS_SIDE.walk);
  return {
    down: [downStand, downWalk, downStand, flipH(downWalk)],
    up: [upStand, upWalk, upStand, flipH(upWalk)],
    left: [leftStand, leftWalk, leftStand, leftWalk],
    right: [flipH(leftStand), flipH(leftWalk), flipH(leftStand), flipH(leftWalk)],
  };
}

// ------------------------------------------------------------------- star ball

const BALL = [
  '................',
  '.....oooooo.....',
  '...ooyyyyyyoo...',
  '..oyhhyyyyyyyo..',
  '.oyhhyyywyyyyYo.',
  '.oyhyyyywyyyyYo.',
  'oyyyyywwwwwyyyYo',
  'oyyyyyywwwyyyyYo',
  'oyyyyyywwwyyyyYo',
  'oyyyyywyyywyyYYo',
  '.oyyyyyyyyyyyYo.',
  '.oyyyyyyyyyyYYo.',
  '..oyyyyyyyyYYo..',
  '...ooYYYYYYoo...',
  '.....oooooo.....',
  '................',
];

export function ballSprite(grey = false): PixelImage {
  const pal = grey
    ? { o: '#5a5a6a', y: '#c8c8d0', Y: '#9a9aa8', h: '#e8e8f0', w: '#ffffff' }
    : { o: '#3a2410', y: '#f8d038', Y: '#e09020', h: '#fff8b0', w: '#ffffff' };
  return fromStrings(BALL, pal);
}

export const lightBody = (c: string) => lighten(c, 0.5);

// ------------------------------------------------------------------ sign

/** A little wooden sign, standing at a legendary's home while it is away. */
export function signSprite(): PixelImage {
  const W = 16;
  const H = 16;
  const img: PixelImage = { w: W, h: H, data: new Uint8ClampedArray(W * H * 4) };
  const put = (x: number, y: number, hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    img.data.set([r, g, b, 255], (y * W + x) * 4);
  };
  // post with a little shadow
  for (let x = 5; x <= 10; x++) put(x, 15, '#4a6a30');
  for (let y = 9; y <= 14; y++) {
    put(7, y, '#a8784a');
    put(8, y, '#6a4224');
  }
  // board
  for (let y = 2; y <= 9; y++) {
    for (let x = 1; x <= 14; x++) {
      const edge = x === 1 || x === 14 || y === 2 || y === 9;
      put(x, y, edge ? '#3a2414' : y === 3 ? '#f0cc96' : '#deb07a');
    }
  }
  // "writing" on the board
  for (let x = 3; x <= 12; x++) put(x, 5, '#6a4224');
  for (let x = 3; x <= 9; x++) put(x, 7, '#6a4224');
  put(11, 7, '#6a4224');
  return img;
}
