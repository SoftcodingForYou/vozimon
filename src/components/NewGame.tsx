import { useEffect, useState } from 'react';
import { MAX_NAME, cleanName, nameTaken, type Mode, type SaveSlot } from '../game/save';
import { getSpecies, STARTERS } from '../game/creatures';
import { AVATARS } from '../art/sprites';
import { avatarURL, ballURL, mapPreviewURL, portraitURL } from '../art/assets';
import { MAP_NAMES, type MapId } from '../world/tiles';
import { setTextMode, useInput } from '../system/input';
import { sfx } from '../system/audio';
import { Menu, LAYER, KeyHint, KeyCap, A, Bb, TypeBadge } from './ui';
import { ConfirmDialog } from './ConfirmDialog';

export interface NewGameResult {
  name: string;
  mode: Mode;
  map: MapId;
  avatar: number;
  starter: number | null;
}

interface Props {
  slots: SaveSlot[];
  onCancel: () => void;
  onCreate: (r: NewGameResult) => void;
}

/** The Normal / Fácil choice is hidden for now: new games are Normal (Fácil games still play). */
const SHOW_MODE_CHOICE = false;

export function NewGame({ slots, onCancel, onCreate }: Props) {
  const [step, setStep] = useState<'name' | 'mode' | 'map' | 'avatar' | 'starter'>('name');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('normal');
  const [map, setMap] = useState<MapId>('estaciones');
  const [avatar, setAvatar] = useState(0);

  if (step === 'name') {
    return (
      <NameEntry
        initial={name}
        slots={slots}
        onCancel={onCancel}
        onDone={(n) => {
          setName(n);
          setStep(SHOW_MODE_CHOICE ? 'mode' : 'map');
        }}
      />
    );
  }
  if (step === 'mode') {
    return (
      <ModeSelect
        initial={mode}
        onBack={() => setStep('name')}
        onDone={(m) => {
          setMode(m);
          setStep('map');
        }}
      />
    );
  }
  if (step === 'map') {
    return (
      <MapSelect
        initial={map}
        onBack={() => setStep(SHOW_MODE_CHOICE ? 'mode' : 'name')}
        onDone={(m) => {
          setMap(m);
          setStep('avatar');
        }}
      />
    );
  }
  if (step === 'avatar') {
    return (
      <AvatarSelect
        initial={avatar}
        onBack={() => setStep('map')}
        onDone={(a) => {
          setAvatar(a);
          if (mode === 'normal') setStep('starter');
          else onCreate({ name, mode, map, avatar: a, starter: null });
        }}
      />
    );
  }
  return <StarterSelect onBack={() => setStep('avatar')} onDone={(s) => onCreate({ name, mode, map, avatar, starter: s })} />;
}

// ------------------------------------------------------------------ name

const ROWS = ['ABCDEFGHI', 'JKLMNÑOPQ', 'RSTUVWXYZ', 'ÁÉÍÓÚ123 '];
const COLS = 9;
const DELETE = 'BORRAR';
const DONE = 'LISTO';

export function NameEntry({ initial, slots, onCancel, onDone }: { initial: string; slots: SaveSlot[]; onCancel: () => void; onDone: (name: string) => void }) {
  const [text, setText] = useState(initial);
  const [row, setRow] = useState(0);
  const [col, setCol] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    setTextMode(true);
    return () => setTextMode(false);
  }, []);

  const keyAt = (r: number, c: number): string => (r < ROWS.length ? ROWS[r][c] : c < 4 ? DELETE : DONE);

  const fail = (msg: string) => {
    sfx('error');
    setError(msg);
  };

  const type = (ch: string) => {
    if (text.length >= MAX_NAME) return fail('¡El nombre ya es muy largo!');
    if (ch === ' ' && (!text.length || text.endsWith(' '))) return;
    sfx('type');
    setError('');
    setText(text + ch.toLocaleUpperCase('es'));
  };

  const erase = () => {
    if (!text.length) return;
    sfx('back');
    setError('');
    setText(text.slice(0, -1));
  };

  const confirm = () => {
    const clean = cleanName(text);
    if (!clean) return fail('Primero escribe un nombre.');
    if (nameTaken(clean, slots)) return fail('¡Ese nombre ya existe! Elige otro nombre.');
    sfx('ok');
    onDone(clean);
  };

  const activate = (k: string) => {
    if (k === DELETE) erase();
    else if (k === DONE) confirm();
    else type(k);
  };

  const moveTo = (r: number, c: number) => {
    sfx('move');
    setRow(r);
    setCol(c);
  };

  useInput((e) => {
    if (e.char) {
      type(e.char);
      // After typing on a real keyboard, Enter finishes the name.
      setRow(ROWS.length);
      setCol(COLS - 1);
      return;
    }
    if (e.key === 'Backspace') return erase();
    const lastRow = ROWS.length;
    switch (e.btn) {
      case 'up':
        moveTo((row + lastRow) % (lastRow + 1), row === 0 ? (col < 4 ? 0 : COLS - 1) : col);
        break;
      case 'down':
        moveTo((row + 1) % (lastRow + 1), col);
        break;
      case 'left':
        if (row === lastRow) moveTo(row, col < 4 ? COLS - 1 : 0);
        else moveTo(row, (col + COLS - 1) % COLS);
        break;
      case 'right':
        if (row === lastRow) moveTo(row, col < 4 ? COLS - 1 : 0);
        else moveTo(row, (col + 1) % COLS);
        break;
      case 'a':
        activate(keyAt(row, col));
        break;
      case 'b':
        if (e.key === 'Escape' || !text.length) {
          sfx('back');
          onCancel();
        } else erase();
        break;
    }
  }, LAYER.screen);

  return (
    <div className="screen name-screen">
      <h2 className="screen-title">¿Cómo se llama tu partida?</h2>
      <div className="name-field">
        {text}
        <span className="caret blink">_</span>
      </div>
      <p className={'name-error' + (error ? ' show' : '')}>{error || ' '}</p>
      <div className="panel keyboard">
        {ROWS.map((r, ri) => (
          <div className="key-row" key={ri}>
            {r.split('').map((ch, ci) => (
              <button
                key={ci}
                className={'key' + (ri === row && ci === col ? ' sel' : '')}
                onClick={() => {
                  setRow(ri);
                  setCol(ci);
                  activate(ch);
                }}
              >
                {ch === ' ' ? '␣' : ch}
              </button>
            ))}
          </div>
        ))}
        <div className="key-row">
          <button className={'key wide' + (row === ROWS.length && col < 4 ? ' sel' : '')} onClick={() => activate(DELETE)}>
            ⌫ Borrar
          </button>
          <button className={'key wide done' + (row === ROWS.length && col >= 4 ? ' sel' : '')} onClick={() => activate(DONE)}>
            ✓ ¡Listo!
          </button>
        </div>
      </div>
      <KeyHint>
        <KeyCap btn="a" typing /> Escribir &nbsp; <KeyCap btn="b" typing /> Borrar &nbsp; · También puedes escribir con el teclado
      </KeyHint>
    </div>
  );
}

// ------------------------------------------------------------------ mode

function ModeSelect({ initial, onBack, onDone }: { initial: Mode; onBack: () => void; onDone: (m: Mode) => void }) {
  const modes: { m: Mode; title: string; text: string }[] = [
    { m: 'normal', title: 'Normal', text: 'Lucha con tus Vozimón. Si ganas, ¡lo atrapas!' },
    { m: 'easy', title: 'Fácil', text: 'Sin peleas: lanza la bola estrella y... ¡a ver si lo atrapas!' },
  ];
  return (
    <div className="screen mode-screen">
      <h2 className="screen-title">¿Cómo quieres jugar?</h2>
      <Menu
        options={modes.map((x) => ({ label: x.title }))}
        columns={2}
        initial={initial === 'easy' ? 1 : 0}
        layer={LAYER.screen}
        onBack={onBack}
        onSelect={(i) => onDone(modes[i].m)}
        className="mode-cards"
        render={(_, i, sel) => (
          <div className={'mode-card ' + modes[i].m + (sel ? ' sel' : '')}>
            <div className="mode-icon">
              {modes[i].m === 'normal' ? (
                <span className="vs">
                  <img className="pix" src={portraitURL(1)} alt="" />
                  <b>VS</b>
                  <img className="pix flip" src={portraitURL(4)} alt="" />
                </span>
              ) : (
                <img className="pix big-ball" src={ballURL()} alt="" />
              )}
            </div>
            <h3>{modes[i].title}</h3>
            <p>{modes[i].text}</p>
          </div>
        )}
      />
      <KeyHint>
        <A /> Elegir &nbsp; <Bb /> Volver
      </KeyHint>
    </div>
  );
}

// ------------------------------------------------------------------ map

const MAPS: { id: MapId; text: string }[] = [
  { id: 'estaciones', text: 'Volcanes, playa, nieve y bosque.' },
  { id: 'santiago', text: 'La ciudad: cada comuna tiene su tipo.' },
];

function MapSelect({ initial, onBack, onDone }: { initial: MapId; onBack: () => void; onDone: (m: MapId) => void }) {
  return (
    <div className="screen mode-screen">
      <h2 className="screen-title">¿Dónde quieres jugar?</h2>
      <Menu
        options={MAPS.map((x) => ({ label: MAP_NAMES[x.id] }))}
        columns={2}
        initial={initial === 'santiago' ? 1 : 0}
        layer={LAYER.screen}
        onBack={onBack}
        onSelect={(i) => onDone(MAPS[i].id)}
        className="mode-cards"
        render={(o, i, sel) => (
          <div className={'mode-card map-card' + (sel ? ' sel' : '')}>
            <img className="map-preview" src={mapPreviewURL(MAPS[i].id, 230)} alt="" draggable={false} />
            <h3>{o.label}</h3>
            <p>{MAPS[i].text}</p>
          </div>
        )}
      />
      <KeyHint>
        <A /> Elegir &nbsp; <Bb /> Volver
      </KeyHint>
    </div>
  );
}

// ------------------------------------------------------------------ avatar

function AvatarSelect({ initial, onBack, onDone }: { initial: number; onBack: () => void; onDone: (a: number) => void }) {
  return (
    <div className="screen avatar-screen">
      <h2 className="screen-title">¿Quién eres?</h2>
      <Menu
        options={AVATARS.map((a) => ({ label: a.name }))}
        columns={3}
        initial={initial}
        layer={LAYER.screen}
        onBack={onBack}
        onSelect={onDone}
        className="avatar-grid"
        render={(o, i, sel) => (
          <div className={'avatar-card' + (sel ? ' sel' : '')}>
            <img className="pix" src={avatarURL(i)} alt={o.label} draggable={false} />
          </div>
        )}
      />
      <KeyHint>
        <A /> Elegir &nbsp; <Bb /> Volver
      </KeyHint>
    </div>
  );
}

// ------------------------------------------------------------------ starter

function StarterSelect({ onBack, onDone }: { onBack: () => void; onDone: (id: number) => void }) {
  const [asking, setAsking] = useState<number | null>(null);
  return (
    <div className="screen starter-screen">
      <h2 className="screen-title">¡Elige a tu primer compañero!</h2>
      <Menu
        options={STARTERS.map((id) => {
          const s = getSpecies(id);
          return { label: s.name };
        })}
        columns={3}
        layer={LAYER.screen}
        active={asking === null}
        onBack={onBack}
        onSelect={(i) => setAsking(STARTERS[i])}
        className="starter-cards"
        render={(_, i, sel) => {
          const s = getSpecies(STARTERS[i]);
          return (
            <div className={'starter-card' + (sel ? ' sel' : '')}>
              <img className="pix" src={portraitURL(s.id)} alt={s.name} draggable={false} />
              <h3>{s.name}</h3>
              <div>
                {s.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            </div>
          );
        }}
      />
      <KeyHint>
        <A /> Elegir &nbsp; <Bb /> Volver
      </KeyHint>
      {asking !== null && (
        <ConfirmDialog
          text={`¿Quieres que ${getSpecies(asking).name} sea tu compañero?`}
          onAnswer={(yes) => {
            if (yes) {
              sfx('caught');
              onDone(asking);
            }
            setAsking(null);
          }}
        />
      )}
    </div>
  );
}
