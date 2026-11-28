import { useEffect, useRef, useState } from 'react';
import { clearTaps, frameDir, isHeld, useInput } from '../system/input';
import { SAY, useVoice } from '../system/voice';
import { sfx } from '../system/audio';
import { updateWorld, type Encounter, type WorldState } from '../world/world';
import { renderWorld, VIEW_H, VIEW_W } from '../world/renderer';
import { refreshWorldArt } from '../art/assets';
import { LAYER } from './ui';

interface Props {
  world: WorldState;
  avatar: number;
  paused: boolean;
  onEncounter: (e: Encounter) => void;
  onSign: (sp: number) => void; // read the sign of a legendary that is away
  onMenu: () => void;
  onDex: () => void;
  onTypes: () => void;
  onMap: () => void;
  onAutosave: () => void;
}

/** The overworld canvas with its game loop. */
export function WorldView({ world, avatar, paused, onEncounter, onSign, onMenu, onDex, onTypes, onMap, onAutosave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  // Every time the world shows again (after a battle, the map, the menu...) or the page comes
  // back from the background, it gets a brand-new canvas and freshly drawn sprites: iOS Safari
  // may have wiped canvases meanwhile, which left a black screen after battles.
  const [gen, setGen] = useState(0);
  const wasPaused = useRef(paused);
  useEffect(() => {
    if (wasPaused.current && !paused) {
      refreshWorldArt();
      setGen((g) => g + 1);
    }
    wasPaused.current = paused;
  }, [paused]);
  useEffect(() => {
    const onShow = () => {
      if (document.hidden) return;
      refreshWorldArt();
      setGen((g) => g + 1);
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('pageshow', onShow);
    return () => {
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);
  const cb = useRef({ onEncounter, onSign, onMenu, onDex, onTypes, onMap, onAutosave });
  cb.current = { onEncounter, onSign, onMenu, onDex, onTypes, onMap, onAutosave };
  pausedRef.current = paused;

  useInput(
    (e) => {
      if (e.btn === 'menu') {
        sfx('ok');
        cb.current.onMenu();
      } else if (e.btn === 'dex') {
        sfx('ok');
        cb.current.onDex();
      } else if (e.btn === 'types') {
        sfx('ok');
        cb.current.onTypes();
      } else if (e.btn === 'map') {
        sfx('ok');
        cb.current.onMap();
      }
    },
    LAYER.world,
    !paused,
  );

  // playing by voice: «mapa», «vozidex» and «tipos» open them, like their keys
  const open = (fn: () => void) => () => {
    sfx('ok');
    fn();
  };
  useVoice(
    {
      cmds: [
        { words: SAY.mapa, run: open(() => cb.current.onMap()) },
        { words: SAY.vozidex, run: open(() => cb.current.onDex()) },
        { words: SAY.tipos, run: open(() => cb.current.onTypes()) },
      ],
    },
    LAYER.world,
    !paused,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (pausedRef.current) {
        clearTaps();
      } else {
        const ev = updateWorld(world, dt, { dir: frameDir(), run: isHeld('b') });
        if (ev.bump) sfx('bump');
        if (ev.rustle) sfx('rustle');
        if (ev.autosave) cb.current.onAutosave(); // every 5th step
        if (ev.sign) {
          sfx('ok');
          pausedRef.current = true;
          cb.current.onSign(ev.sign);
        }
        if (ev.encounter) {
          pausedRef.current = true; // stop right away, before React re-renders
          cb.current.onEncounter(ev.encounter);
        }
      }
      renderWorld(ctx, world, avatar);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [world, avatar, gen]);

  return <canvas key={gen} ref={canvasRef} width={VIEW_W} height={VIEW_H} className="world-canvas" />;
}
