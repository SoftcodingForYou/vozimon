import { useEffect, useRef, useState } from 'react';
import { countFight, countWin, loadWorldData, saveWorldData, type SaveSlot, type Settings } from '../game/save';
import { TOTAL, getSpecies } from '../game/creatures';
import type { Elem } from '../game/elements';
import { getWorldMap } from '../world/maps';
import {
  zoneOfPlayer,
  createWorld,
  setUnlockAll,
  finishEncounter,
  restoreWorld,
  snapshotWorld,
  type Encounter,
  type Outcome,
  type WorldState,
} from '../world/world';
import { playMusic } from '../system/audio';
import { useBindings, useInputSource } from '../system/input';
import { SECRET_CODE, keyLabel, typedTail } from '../system/keys';
import { sfx } from '../system/audio';
import { simulateHeard, useVoiceSession } from '../system/voice';
import { WorldView } from './WorldView';
import { Battle } from './Battle';
import { Dex } from './Dex';
import { SettingsPanel } from './SettingsPanel';
import { TypeChart } from './TypeChart';
import { WorldMapView } from './WorldMapView';
import { Menu, TextBox, LAYER, BallIcon, EyeIcon, Qq, Ee, Tt, Mm, TypeBadge, VoiceBadge, VoiceHeard } from './ui';

type Overlay =
  | { k: 'welcome' }
  | { k: 'menu' }
  | { k: 'dex' }
  | { k: 'settings' }
  | { k: 'types' }
  | { k: 'map' }
  | { k: 'transition'; enc: Encounter }
  | { k: 'battle'; enc: Encounter }
  | { k: 'unlocked'; on: boolean }
  | { k: 'sign'; sp: number }
  | null;

interface Props {
  slot: SaveSlot;
  updateSlot: (fn: (s: SaveSlot) => SaveSlot) => void;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onExit: () => void;
  persist: boolean; // false for throwaway demo games
  initialEncounter?: Encounter | null;
  initialOverlay?: 'dex' | 'types' | 'map' | 'none';
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Play({ slot, updateSlot, settings, onSettings, onExit, persist, initialEncounter, initialOverlay }: Props) {
  // Continue exactly where the last session stopped, or start on a random road.
  const worldRef = useRef<WorldState | null>(null);
  const resumed = useRef(false);
  if (!worldRef.current) {
    const map = getWorldMap(slot.map);
    const restored = persist ? restoreWorld(map, loadWorldData(slot.id), slot.caught) : null;
    resumed.current = restored !== null;
    worldRef.current = restored ?? createWorld(map, slot.caught);
    setUnlockAll(worldRef.current, slot.allUnlocked);
  }
  const world = worldRef.current;

  const saveWorld = useRef(() => {});
  saveWorld.current = () => {
    if (persist) saveWorldData(slot.id, snapshotWorld(world));
  };

  const [overlay, setOverlay] = useState<Overlay>(() => {
    if (initialEncounter) return { k: 'battle', enc: initialEncounter };
    if (initialOverlay === 'dex' || initialOverlay === 'types' || initialOverlay === 'map') return { k: initialOverlay };
    if (initialOverlay === 'none') return null;
    return { k: 'welcome' };
  });
  const [zone, setZone] = useState<{ name: string; type?: Elem; n: number } | null>(null);
  const lastZone = useRef(-1);
  const keys = useBindings();
  const source = useInputSource();
  useVoiceSession(); // while playing, "Jugar con la voz" listens (if a grown-up switched it on)

  // Saving: a brand-new world right away, then every 5th step (see WorldView),
  // after every battle, and whenever the game is left, hidden or closed.
  useEffect(() => {
    if (!resumed.current) saveWorld.current();
    const save = () => saveWorld.current();
    const onVisibility = () => {
      if (document.hidden) save();
    };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      save();
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Secret code: typed while the in-game menu (Q) is open, it unlocks everything; typed again it
  // switches that off, leaving only what was really earned. Nothing listens anywhere else.
  const typed = useRef({ tail: '', at: 0 });
  useEffect(() => {
    if (overlay?.k !== 'menu') return;
    typed.current.tail = '';
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = typed.current;
      if (performance.now() - t.at > 2500) t.tail = ''; // letters must come in one go
      t.at = performance.now();
      t.tail = typedTail(t.tail, e.key);
      if (t.tail !== SECRET_CODE) return;
      t.tail = '';
      const on = !world.unlockAll;
      setUnlockAll(world, on);
      updateSlot((s) => ({ ...s, allUnlocked: on }));
      sfx(on ? 'newdex' : 'back');
      setOverlay({ k: 'unlocked', on });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, world]);

  // Test hook: ?debug exposes the world state in the browser console, and __vozi.say('mapa')
  // acts as if that had been heard (playing by voice, without a microphone).
  useEffect(() => {
    if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __vozi: unknown }).__vozi = { world, say: simulateHeard };
  }, [world]);

  useEffect(() => {
    if (overlay?.k !== 'transition' && overlay?.k !== 'battle') playMusic('world');
  }, [overlay]);

  // Show the name of the area (or city district, with its type) when the player walks into a new one.
  useEffect(() => {
    const t = setInterval(() => {
      const z = zoneOfPlayer(world);
      if (z === lastZone.current) return;
      lastZone.current = z;
      const info = world.map.zones[z];
      if (info) setZone({ name: capitalize(info.name), type: info.type, n: Date.now() });
    }, 400);
    return () => clearInterval(t);
  }, [world]);

  useEffect(() => {
    if (!zone) return;
    const t = setTimeout(() => setZone(null), 2600);
    return () => clearTimeout(t);
  }, [zone]);

  const markSeen = (id: number) =>
    updateSlot((s) => (s.seen.includes(id) ? s : { ...s, seen: [...s.seen, id].sort((a, b) => a - b) }));
  const recordFight = (id: number) => updateSlot((s) => ({ ...s, record: countFight(s.record, id) }));
  const recordWin = (id: number) => updateSlot((s) => ({ ...s, record: countWin(s.record, id) }));
  const markCaught = (id: number) =>
    updateSlot((s) => ({
      ...s,
      seen: s.seen.includes(id) ? s.seen : [...s.seen, id].sort((a, b) => a - b),
      caught: s.caught.includes(id) ? s.caught : [...s.caught, id].sort((a, b) => a - b),
    }));

  const markRead = (id: number) =>
    updateSlot((s) => (s.read.includes(id) || !s.seen.includes(id) ? s : { ...s, read: [...s.read, id].sort((a, b) => a - b) }));

  const endBattle = (enc: Encounter, outcome: Outcome) => {
    finishEncounter(world, enc, outcome);
    saveWorld.current();
    setOverlay(null);
  };

  const openIfFree = (o: Overlay) => {
    if (overlay === null) setOverlay(o);
  };

  const arrows = keys.up === 'ArrowUp' && keys.down === 'ArrowDown' && keys.left === 'ArrowLeft' && keys.right === 'ArrowRight';
  const walk =
    source === 'touch'
      ? 'Camina con las flechas de la pantalla.'
      : source === 'pad'
        ? 'Camina con la cruceta del mando.'
        : arrows
          ? 'Camina con las flechas.'
          : `Camina con las teclas ${[keys.up, keys.left, keys.down, keys.right].map(keyLabel).join(', ')}.`;
  const welcomeText = resumed.current
    ? `¡Hola de nuevo, ${slot.name}! Seguimos justo donde lo dejaste.`
    : slot.mode === 'easy'
      ? `¡Hola, ${slot.name}! ${walk} Busca Vozimón por el mundo y en la hierba alta. Cuando encuentres uno, ¡lánzale la bola estrella!`
      : `¡Hola, ${slot.name}! ${walk} Busca Vozimón por el mundo y en la hierba alta. Lucha con tus compañeros y, si ganas, ¡atrápalo!`;

  return (
    <div className="play">
      <WorldView
        world={world}
        avatar={slot.avatar}
        paused={overlay !== null}
        onEncounter={(enc) => setOverlay({ k: 'transition', enc })}
        onSign={(sp) => setOverlay({ k: 'sign', sp })}
        onMenu={() => setOverlay({ k: 'menu' })}
        onDex={() => setOverlay({ k: 'dex' })}
        onTypes={() => setOverlay({ k: 'types' })}
        onMap={() => setOverlay({ k: 'map' })}
        onAutosave={() => saveWorld.current()}
      />

      <div className="hud">
        <span className="hud-box">
          <BallIcon size={26} /> {slot.caught.length}/{TOTAL}
          <EyeIcon size={26} /> {slot.seen.length}
        </span>
        {settings.voice && <VoiceBadge />}
        <div className="hud-keys">
          <span className="hud-box hud-key" onClick={() => openIfFree({ k: 'menu' })}>
            <Qq /> Menú
          </span>
          <span className="hud-box hud-key" onClick={() => openIfFree({ k: 'dex' })}>
            <Ee /> Vozidex
          </span>
          <span className="hud-box hud-key" onClick={() => openIfFree({ k: 'types' })}>
            <Tt /> Tipos
          </span>
          <span className="hud-box hud-key" onClick={() => openIfFree({ k: 'map' })}>
            <Mm /> Mapa
          </span>
        </div>
      </div>
      {zone && overlay === null && (
        <div key={zone.n} className="zone-banner">
          {zone.name}
          {zone.type && <TypeBadge type={zone.type} />}
        </div>
      )}

      {overlay?.k === 'unlocked' && (
        <div className="dialog-backdrop">
          <div className="panel dialog unlocked">
            {overlay.on ? (
              <>
                <p className="dialog-title">¡Todo desbloqueado!</p>
                <p>
                  Ahora el juego hace como si ya tuvieras a los 150 Vozimón. ¡El Vozimón misterioso pasea por el mundo!
                  Búscalo en el mapa.
                </p>
              </>
            ) : (
              <>
                <p className="dialog-title">Desbloqueo apagado</p>
                <p>Todo vuelve a ser como antes: solo queda lo que has conseguido tú.</p>
              </>
            )}
            <Menu
              options={[{ label: '¡Genial!' }]}
              layer={LAYER.dialog}
              onSelect={() => setOverlay({ k: 'menu' })}
              onBack={() => setOverlay({ k: 'menu' })}
            />
          </div>
        </div>
      )}

      {overlay?.k === 'sign' && (
        <div className="overlay-bottom">
          <TextBox text={`¡${getSpecies(overlay.sp).name} se fue! Tal vez vuelva pronto.`} layer={LAYER.overlay} onDone={() => setOverlay(null)} />
        </div>
      )}

      {overlay?.k === 'welcome' && (
        <div className="overlay-bottom">
          <TextBox text={welcomeText} layer={LAYER.overlay} onDone={() => setOverlay(null)} />
        </div>
      )}

      {overlay?.k === 'menu' && (
        <div className="world-menu panel">
          <Menu
            options={[
              { label: 'Ajustes', icon: <span className="gear">⚙</span> },
              { label: 'Salir', icon: <span className="door">⇦</span> },
              { label: 'Seguir', icon: <span className="door">▶</span> },
            ]}
            layer={LAYER.overlay}
            closeBtn="menu"
            onBack={() => setOverlay(null)}
            onSelect={(i) => {
              if (i === 0) setOverlay({ k: 'settings' });
              else if (i === 1) {
                saveWorld.current();
                onExit();
              } else setOverlay(null);
            }}
          />
          <p className="saved-note">La partida se guarda sola.</p>
        </div>
      )}

      {overlay?.k === 'dex' && <Dex slot={slot} reading={settings.reading} onRead={markRead} onClose={() => setOverlay(null)} />}
      {overlay?.k === 'types' && <TypeChart onClose={() => setOverlay(null)} />}
      {overlay?.k === 'map' && <WorldMapView world={world} caught={slot.caught} avatar={slot.avatar} onClose={() => setOverlay(null)} />}
      {overlay?.k === 'settings' && <SettingsPanel settings={settings} onChange={onSettings} onClose={() => setOverlay({ k: 'menu' })} />}
      {overlay?.k === 'transition' && <EncounterTransition onDone={() => setOverlay({ k: 'battle', enc: overlay.enc })} />}
      {overlay?.k === 'battle' && (
        <Battle
          key={overlay.enc.uid ?? 'grass-' + overlay.enc.sp}
          enc={overlay.enc}
          slot={slot}
          onSeen={markSeen}
          onCaught={markCaught}
          onFight={recordFight}
          onWin={recordWin}
          reading={settings.reading}
          onRead={markRead}
          voice={settings.voice}
          onEnd={(o) => endBattle(overlay.enc, o)}
        />
      )}
      {settings.voice && <VoiceHeard className={overlay?.k === 'battle' ? 'in-battle' : undefined} />}
    </div>
  );
}

function EncounterTransition({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    playMusic('battle');
    const t = setTimeout(onDone, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="encounter-transition">
      <div className="flash" />
      <div className="bars">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${0.45 + i * 0.04}s` }} />
        ))}
      </div>
    </div>
  );
}
