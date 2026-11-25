// Draws the world (map, wild Vozimon and the player) onto a small canvas.

import { getGrassFront, getMapPixels, getOwFrames, getPlayerFrames, getSign } from '../art/assets';
import { hash2 } from '../game/rng';
import { T } from './tiles';
import { MYTHICAL_ID } from '../game/creatures';
import { TILE } from './tileArt';
import { signAt, type Mover, type WorldState } from './world';

export const VIEW_W = 256;
export const VIEW_H = 192;

function pos(m: Mover): [number, number] {
  const k = m.moving ? m.t : 1;
  return [(m.fx + (m.x - m.fx) * k) * TILE, (m.fy + (m.y - m.fy) * k) * TILE];
}

/** The tile the mover is visually standing on. */
function standCell(m: Mover): [number, number] {
  return m.moving && m.t < 0.5 ? [m.fx, m.fy] : [m.x, m.y];
}

export function renderWorld(ctx: CanvasRenderingContext2D, ws: WorldState, avatar: number) {
  const map = ws.map;
  const time = ws.time;
  const [ppx, ppy] = pos(ws.player);
  const maxX = map.w * TILE - VIEW_W;
  const maxY = map.h * TILE - VIEW_H;
  const camX = Math.max(0, Math.min(maxX, Math.round(ppx + TILE / 2 - VIEW_W / 2)));
  const camY = Math.max(0, Math.min(maxY, Math.round(ppy + TILE / 2 - VIEW_H / 2)));

  ctx.imageSmoothingEnabled = false;
  // Copy the visible part of the world from plain pixel data (see assets.ts: nothing to lose).
  ctx.putImageData(getMapPixels(map), -camX, -camY, camX, camY, VIEW_W, VIEW_H);

  // Gentle water sparkles and bubbling lava.
  const tx0 = Math.floor(camX / TILE);
  const ty0 = Math.floor(camY / TILE);
  for (let ty = ty0; ty <= ty0 + VIEW_H / TILE + 1 && ty < map.h; ty++) {
    for (let tx = tx0; tx <= tx0 + VIEW_W / TILE + 1 && tx < map.w; tx++) {
      const t = map.ter[ty * map.w + tx];
      if (t !== T.WATER && t !== T.LAVA) continue;
      const h1 = hash2(tx, ty, 900);
      const phase = (time * (t === T.LAVA ? 0.9 : 0.6) + h1) % 1;
      if (phase > 0.55) continue;
      const sx = tx * TILE - camX + 3 + Math.floor(hash2(tx, ty, 901) * 9);
      const sy = ty * TILE - camY + 4 + Math.floor(hash2(tx, ty, 902) * 8);
      if (t === T.WATER) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(sx + Math.floor(phase * 6), sy, 3, 1);
      } else {
        ctx.fillStyle = phase < 0.3 ? '#ffe070' : '#f8a838';
        const r = phase < 0.3 ? 2 : 1;
        ctx.fillRect(sx, sy, r, r);
      }
    }
  }

  // Entities, drawn from top to bottom.
  type Ent = { y: number; draw: () => void };
  const ents: Ent[] = [];
  const grass = getGrassFront();
  const inView = (x: number, y: number) => x > camX - 32 && y > camY - 32 && x < camX + VIEW_W + 16 && y < camY + VIEW_H + 16;

  for (const c of ws.creatures) {
    const [cx, cy] = pos(c);
    if (!inView(cx, cy)) continue;
    ents.push({
      y: cy,
      draw: () => {
        const frames = getOwFrames(c.sp);
        const list = c.dir === 'right' ? frames.right : frames.left;
        const flap = list.length > 1 ? Math.floor(time * 6 + c.uid) % 2 : 0;
        const bob = c.moving || Math.floor(time * 2.5 + c.uid * 0.37) % 2 === 0 ? -1 : 0;
        const sx = Math.round(cx - camX);
        const sy = Math.round(cy - camY);
        ctx.fillStyle = 'rgba(20,10,30,0.18)';
        ctx.fillRect(sx + 3, sy + 13, 10, 2);
        ctx.drawImage(list[flap], sx, sy - 2 + bob);
        if (c.spot >= 0 || c.sp === MYTHICAL_ID) {
          // golden sparkles around legendary / mythical creatures
          for (let k = 0; k < 3; k++) {
            const a = time * 2 + k * 2.1;
            const px = sx + 8 + Math.round(Math.cos(a) * 10);
            const py = sy + 6 + Math.round(Math.sin(a * 1.3) * 8);
            ctx.fillStyle = k % 2 ? '#fff6a0' : '#ffffff';
            ctx.fillRect(px, py, 1, 1);
            ctx.fillRect(px - 1, py, 3, 1);
            ctx.fillRect(px, py - 1, 1, 3);
          }
        }
        const [gx, gy] = standCell(c);
        if (map.ter[gy * map.w + gx] === T.TALL) ctx.drawImage(grass, gx * TILE - camX, gy * TILE - camY);
      },
    });
  }

  // a sign at the home of each legendary that went away for a while
  for (const s of map.spots) {
    const x = s.x * TILE;
    const y = s.y * TILE;
    if (!inView(x, y) || signAt(ws, s.x, s.y) === null) continue;
    ents.push({ y, draw: () => ctx.drawImage(getSign(), x - camX, y - camY) });
  }

  const p = ws.player;
  ents.push({
    y: ppy,
    draw: () => {
      const frames = getPlayerFrames(avatar)[p.dir];
      const fi = p.moving ? Math.floor(p.animT / (p.dur * 0.5)) % 4 : 0;
      const sx = Math.round(ppx - camX);
      const sy = Math.round(ppy - camY);
      ctx.fillStyle = 'rgba(20,10,30,0.2)';
      ctx.fillRect(sx + 3, sy + 13, 10, 2);
      ctx.drawImage(frames[fi], sx, sy - 3);
      const [gx, gy] = standCell(p);
      if (map.ter[gy * map.w + gx] === T.TALL) ctx.drawImage(grass, gx * TILE - camX, gy * TILE - camY);
    },
  });

  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.draw();
}
