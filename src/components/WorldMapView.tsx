import { useEffect, useLayoutEffect, useRef } from 'react';
import { avatarURL, genericURL, makeMapCanvas, releaseCanvas } from '../art/assets';
import { MYTHICAL_ID } from '../game/creatures';
import { ELEMS } from '../game/elements';
import type { WorldMap } from '../world/tiles';
import { zoneOfPlayer, type WorldState } from '../world/world';
import { useInput } from '../system/input';
import { sfx } from '../system/audio';
import { LAYER, KeyHint, Bb, TypeIcon } from './ui';

/** Colour each district with its type (1 px per tile, scaled up); borders a bit stronger. */
function drawDistricts(ctx: CanvasRenderingContext2D, m: WorldMap, w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = m.w;
  cv.height = m.h;
  const c2 = cv.getContext('2d')!;
  const img = c2.createImageData(m.w, m.h);
  const rgb = m.zones.map((z) => {
    const hex = z.type ? ELEMS[z.type].color : '#ffffff';
    return [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  });
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x;
      const z = m.zone[i];
      if (!m.zones[z]?.type) continue;
      const border = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && m.zone[ny * m.w + nx] !== z;
      });
      const [r, g, b] = rgb[z];
      img.data.set([r, g, b, border ? 210 : 95], i * 4);
    }
  }
  c2.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, 0, 0, m.w, m.h, 0, 0, w, h);
  releaseCanvas(cv);
}

const MAP_H = 412; // on-screen height of the map in stage pixels

export function WorldMapView({ world, caught, avatar, onClose }: { world: WorldState; caught: number[]; avatar: number; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const m = world.map;
  const mapW = Math.round((MAP_H * m.w) / m.h);
  const px = (tx: number) => ((tx + 0.5) / m.w) * mapW;
  const py = (ty: number) => ((ty + 0.5) / m.h) * MAP_H;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const src = makeMapCanvas(m);
    ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, mapW, MAP_H);
    releaseCanvas(src);
    if (m.zones.some((z) => z.type)) drawDistricts(ctx, m, mapW, MAP_H);
  }, [m, mapW]);

  // Keep every name fully inside the map (names near the edge would be cut off).
  useLayoutEffect(() => {
    const clamp = () => {
      frameRef.current?.querySelectorAll<HTMLElement>('.wm-label').forEach((el) => {
        const x = Number(el.dataset.x);
        const half = el.offsetWidth / 2 + 3;
        el.style.left = `${Math.max(half, Math.min(mapW - half, x))}px`;
      });
    };
    clamp();
    void document.fonts?.ready.then(clamp);
  }, [m, mapW]);

  useInput((e) => {
    if (e.btn === 'b' || e.btn === 'a' || e.btn === 'map') {
      sfx('back');
      onClose();
    }
  }, LAYER.dex);

  const p = world.player;
  const here = m.zones[zoneOfPlayer(world)];
  const districts = m.zones.some((z) => z.type);
  // once all 150 are caught, the mythical roams the world: show where it is right now
  const mythical = world.creatures.find((c) => c.sp === MYTHICAL_ID);
  const waiting = m.spots.filter((s) => !caught.includes(s.species));
  return (
    <div className="worldmap">
      <div className="dex-header">
        <h2>MAPA</h2>
        <span className="tc-sub">
          {m.name} · Estás en {here?.name}
        </span>
      </div>
      <div className="wm-frame" ref={frameRef} style={{ width: mapW, height: MAP_H }}>
        <canvas ref={canvasRef} width={mapW} height={MAP_H} />
        {m.labels.map((a) => (
          <span
            key={a.name}
            className={'wm-label' + (a.type ? ' district' : '')}
            data-x={px(a.x)}
            style={{ left: px(a.x), top: py(a.y), ...(a.type ? { borderColor: ELEMS[a.type].color } : {}) }}
          >
            {a.type && (
              <span className="wm-type" style={{ background: ELEMS[a.type].color, color: ELEMS[a.type].text }}>
                <TypeIcon type={a.type} size={14} />
              </span>
            )}
            {a.name}
          </span>
        ))}
        {/* only legendaries still waiting at home; caught ones simply disappear from the map */}
        {waiting.map((s) => (
          <span key={s.species} className="wm-spot wm-star" style={{ left: px(s.x), top: py(s.y) }}>
            ★
          </span>
        ))}
        {mythical && (
          <span className="wm-mythical" style={{ left: px(mythical.x), top: py(mythical.y) }}>
            <img className="pix" src={genericURL(MYTHICAL_ID)} alt="Vozimón misterioso" />
            <b>?</b>
          </span>
        )}
        <span className="wm-player" style={{ left: px(p.x), top: py(p.y) }}>
          <img className="pix" src={avatarURL(avatar)} alt="Estás aquí" />
          <b>¡Aquí!</b>
        </span>
      </div>
      <div className="wm-legend">
        {waiting.length > 0 && (
          <span>
            <span className="wm-star small">★</span> Vive un legendario
          </span>
        )}
        {mythical && (
          <span>
            <img className="pix" src={genericURL(MYTHICAL_ID)} alt="" width={22} height={22} /> Vozimón misterioso
          </span>
        )}
        {districts && <span>Cada comuna tiene su tipo</span>}
      </div>
      <KeyHint>
        <Bb /> Volver
      </KeyHint>
    </div>
  );
}
