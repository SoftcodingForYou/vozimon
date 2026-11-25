import { useEffect, useRef, useState } from 'react';
import { NO_FIGHTS, type FightRecord, type SaveSlot } from '../game/save';
import { SPECIES, TOTAL, HABITAT_NAMES, dexNumber, getSpecies, type Species } from '../game/creatures';
import { getWorldMap } from '../world/maps';
import { zonesOfSpecies } from '../world/world';
import { portraitURL } from '../art/assets';
import { useInput } from '../system/input';
import { sfx } from '../system/audio';
import { canListen } from '../system/listen';
import { LAYER, BallIcon, EyeIcon, KeyHint, A, Bb, TypeBadge, DirKeys, FitText, CupIcon, ScrollBar, MicIcon, StarIcon } from './ui';
import { ReadAloud, TRIES_BEFORE_SKIP } from './ReadAloud';

const COLS = 6;

/** Wins and fights of one of the child's Vozimón (same numbers as in the fighter list). */
function FightLine({ r }: { r: FightRecord }) {
  return (
    <p className="dex-record">
      <CupIcon size={26} />
      {r.fights === 0 ? (
        'Todavía no ha luchado.'
      ) : (
        <>
          Ha ganado{' '}
          <b>
            {r.wins} de {r.fights}
          </b>{' '}
          {r.fights === 1 ? 'combate' : 'combates'}.
        </>
      )}
    </p>
  );
}

const joinY = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : (xs[0] ?? ''));

/** Where to look for a creature in this game's world: habitats, or Santiago's districts. */
function whereItLives(s: Species, mapId: SaveSlot['map']): string {
  const map = getWorldMap(mapId);
  if (s.mythical) return 'todo el mundo (cuando hayas atrapado a los otros 150)';
  if (!map.zones.some((z) => z.type)) return joinY(s.habitats.map((h) => HABITAT_NAMES[h]));
  const spot = map.spots.find((p) => p.species === s.id);
  const zones = spot ? [map.zone[spot.y * map.w + spot.x]] : zonesOfSpecies(map, s.id);
  return joinY(zones.map((z) => map.zones[z].name));
}

interface Props {
  slot: SaveSlot;
  onClose: () => void;
  only?: number;
  reading?: boolean; // "Leer en voz alta" is on: caught Vozimón's names can be read out loud
  onRead?: (id: number) => void;
}

/**
 * The Vozidex, always in Vozidex-number order. With `only`, it shows just that creature's page
 * (when a creature is caught for the first time); Action or Cancel closes it.
 * With reading on, every known creature's page has a "Leer" button: selected (Action reads) until
 * the name was read once; after that it's selected with up/down or tapped. The new page after a
 * catch is a one-time pass: it can only be left once the name was read (or, after 5 tries, the ✕
 * was used), and then the button is gone.
 */
export function Dex({ slot, onClose, only, reading = false, onRead }: Props) {
  const seen = new Set(slot.seen);
  const caught = new Set(slot.caught);
  const [readNow, setReadNow] = useState<number[]>([]); // read in this visit (the slot follows)
  const read = new Set([...slot.read, ...readNow]);
  const [readingId, setReadingId] = useState<number | null>(null);
  const [btnPick, setBtnPick] = useState<boolean | null>(null); // the Leer button chosen with up/down
  const [passed, setPassed] = useState(false); // the new page's one reading is done (or given up with ✕)
  const [idx, setIdx] = useState(() => (only ? only - 1 : slot.seen.length ? slot.seen[0] - 1 : 0));
  const [detail, setDetail] = useState(!!only);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gridRef.current?.querySelector(`[data-i="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [idx, detail]);

  const move = (d: number) => {
    const ni = idx + d;
    if (ni < 0 || ni >= TOTAL) return;
    sfx('move');
    setIdx(ni);
    setBtnPick(null);
  };

  // every Vozimón already met can be read; on the new page after a catch just once
  const canRead = (id: number) => reading && seen.has(id) && !(only && passed);
  const cur = idx + 1;
  const mustRead = !!only && canRead(cur); // the new page: read before going on
  // in the Vozidex the Leer button is selected until the name was read once (then only when chosen again)
  const btnSel = only ? mustRead : detail && canRead(cur) && (btnPick ?? !read.has(cur));
  const startReading = (id: number) => {
    sfx('ok');
    setReadingId(id);
  };

  useInput((e) => {
    if (!only && detail && canRead(cur) && (e.btn === 'up' || e.btn === 'down')) {
      // up/down choose the Leer button (or leave it)
      sfx('move');
      setBtnPick(e.btn === 'down');
      return;
    }
    if (e.btn === 'a' && btnSel) {
      startReading(cur);
      return;
    }
    if (only) {
      if (mustRead) {
        if (e.btn === 'b') sfx('error');
        return;
      }
      if (e.btn === 'a' || e.btn === 'b') {
        sfx('ok');
        onClose();
      }
      return;
    }
    if (e.btn === 'dex') {
      // the Vozidex key closes it again, like M closes the map
      sfx('back');
      onClose();
      return;
    }
    if (detail) {
      if (e.btn === 'left' || e.btn === 'up') move(-1);
      else if (e.btn === 'right' || e.btn === 'down') move(1);
      else if (e.btn === 'a' || e.btn === 'b') {
        sfx('back');
        setDetail(false);
      }
      return;
    }
    switch (e.btn) {
      case 'left':
        move(-1);
        break;
      case 'right':
        move(1);
        break;
      case 'up':
        move(-COLS);
        break;
      case 'down':
        move(COLS);
        break;
      case 'a':
        open(idx);
        break;
      case 'b':
        sfx('back');
        onClose();
        break;
    }
  }, only ? LAYER.picker : LAYER.dex);

  const open = (i: number) => {
    const s = SPECIES[i];
    if (!seen.has(s.id)) {
      sfx('error');
      return;
    }
    sfx('ok');
    setDetail(true);
  };

  const s = getSpecies(idx + 1);
  return (
    <div className={'dex' + (only ? ' dex-new' : '') + (reading ? ' reading' : '')}>
      <div className="dex-header">
        <h2>VOZIDEX</h2>
        {only && <span className="dex-new-badge">¡Nuevo!</span>}
        <span className="dex-count">
          <BallIcon size={26} /> {caught.size}/{TOTAL} atrapados
        </span>
        <span className="dex-count">
          <EyeIcon size={26} /> {seen.size} vistos
        </span>
        {reading && !only && (
          <span className="dex-count">
            <StarIcon size={26} /> {read.size}
          </span>
        )}
      </div>
      {!detail && (
        <div className="dex-grid" ref={gridRef}>
          {SPECIES.map((sp, i) => {
            const isSeen = seen.has(sp.id);
            return (
              <div
                key={sp.id}
                data-i={i}
                className={'dex-cell' + (i === idx ? ' sel' : '') + (isSeen ? '' : ' unknown')}
                onClick={() => {
                  setIdx(i);
                  open(i);
                }}
              >
                <span className="dex-num">{dexNumber(sp.id)}</span>
                <span className="dex-mark">
                  {reading && read.has(sp.id) && <StarIcon size={22} />}
                  {caught.has(sp.id) ? <BallIcon size={22} /> : isSeen ? <EyeIcon size={22} /> : null}
                </span>
                {isSeen ? <img className="pix dex-img" src={portraitURL(sp.id)} alt={sp.name} draggable={false} /> : <span className="dex-q">?</span>}
                <FitText className="dex-name">{isSeen ? sp.name : '???'}</FitText>
              </div>
            );
          })}
        </div>
      )}
      {!detail && <ScrollBar target={gridRef} className="dex-scroll" />}
      {detail && seen.has(s.id) && (
        <div className="dex-detail">
          <div className="dex-left">
            <div className={'dex-portrait bg-' + s.habitats[0]}>
              <img className="pix" src={portraitURL(s.id)} alt={s.name} draggable={false} />
            </div>
            {canRead(s.id) && (
              <div className="dex-read">
                <button className={'read-btn' + (btnSel ? ' sel' : '')} onClick={() => startReading(s.id)}>
                  {btnSel && <A />} {canListen() ? <MicIcon size={38} /> : null} Leer
                </button>
              </div>
            )}
          </div>
          <div className="dex-info">
            <p className="dex-big-num">{dexNumber(s.id)}</p>
            <h3>
              {s.name} {caught.has(s.id) ? <BallIcon size={34} /> : <EyeIcon size={34} />}
              {reading && read.has(s.id) && <StarIcon size={34} />}
            </h3>
            <p>
              {s.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </p>
            <p>
              <b>Ataque:</b> {s.attack}
            </p>
            <p>
              <b>Vive en:</b> {whereItLives(s, slot.map)}
              {s.legendary ? ' (¡es legendario!)' : s.mythical ? ' (¡es mítico!)' : ''}
            </p>
            <p className="dex-desc">{s.desc}</p>
            <p className="dex-status">{caught.has(s.id) ? '¡Atrapado!' : 'Visto, pero aún no atrapado'}</p>
            {caught.has(s.id) && <FightLine r={slot.record[s.id] ?? NO_FIGHTS} />}
          </div>
        </div>
      )}
      {detail && !seen.has(s.id) && (
        <div className="dex-detail unknown">
          <span className="dex-q big">?</span>
          <p>Todavía no conoces al número {s.id}.</p>
        </div>
      )}
      <KeyHint>
        {mustRead ? null : only ? (
          <>
            <A /> <Bb /> Seguir
          </>
        ) : detail ? (
          <>
            <DirKeys pair="lr" /> Anterior / Siguiente &nbsp;{' '}
            {canRead(cur) && !btnSel && (
              <>
                <DirKeys pair="ud" /> Leer &nbsp;{' '}
              </>
            )}
            <Bb /> Volver
          </>
        ) : (
          <>
            <A /> Ver &nbsp; <Bb /> Cerrar
          </>
        )}
      </KeyHint>
      {readingId !== null && (
        <ReadAloud
          key={readingId}
          id={readingId}
          closeAfter={only ? TRIES_BEFORE_SKIP : 0}
          onRead={() => {
            setReadNow((r) => [...r, readingId]);
            setBtnPick(null); // read: Action goes on again
            if (only) setPassed(true);
            onRead?.(readingId);
          }}
          onSkip={() => {
            if (only) setPassed(true);
            setBtnPick(false); // Action goes on now
            setReadingId(null);
          }}
          onClose={() => setReadingId(null)}
        />
      )}
    </div>
  );
}
