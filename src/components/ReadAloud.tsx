import { useEffect, useRef, useState } from 'react';
import { getSpecies } from '../game/creatures';
import { syllables } from '../game/reading';
import { canListen, heardLastTime, listenFor } from '../system/listen';
import { useInput } from '../system/input';
import { sfx } from '../system/audio';
import { Menu, LAYER, FitText, MicIcon, MicOffIcon, StarIcon, CheckMark, CrossMark } from './ui';

const LAYER_READ = LAYER.dialog + 2;
/** On the new page after a catch, the ✕ in the corner shows after this many tries that weren't understood. */
export const TRIES_BEFORE_SKIP = 3;
const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

/** Why nothing listens (a short note for the grown-up who then confirms with ✓). */
const NO_MIC_NOTE = {
  browser: 'Este navegador no escucha. Usa Chrome, Edge o Safari.',
  denied: 'Falta el permiso para usar el micrófono.',
  broken: 'El micrófono no funciona ahora.',
};

/**
 * The child reads a caught Vozimón's name out loud. Few words on purpose (the children are just
 * learning to read): the name to read, a microphone while listening, stars when it worked, and the
 * name in coloured syllables with "Otra vez" when it didn't (yet). There is no backing out. Only
 * where nothing can listen (no speech recognition, no microphone) a grown-up confirms with ✓.
 */
interface Props {
  id: number;
  onRead: () => void; // read (or confirmed by a grown-up): a star
  onSkip: () => void; // ✕: no star, but the child may go on
  onClose: () => void;
  closeAfter?: number; // misses before the ✕ shows (0: from the start, when practising in the Vozidex)
}

export function ReadAloud({ id, onRead, onSkip, onClose, closeAfter = 0 }: Props) {
  const name = getSpecies(id).name;
  // listen: microphone open · ok: read! · again: not understood (syllables) · adult: can't listen here
  const [phase, setPhase] = useState<'listen' | 'ok' | 'again' | 'adult'>(() => (canListen() ? 'listen' : 'adult'));
  const [round, setRound] = useState(0);
  const [noMic, setNoMic] = useState<keyof typeof NO_MIC_NOTE>('browser');
  const [misses, setMisses] = useState(0);
  const canSkip = misses >= closeAfter && phase !== 'ok';
  const skip = () => {
    sfx('back');
    onSkip();
  };
  const [hearing, setHearing] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const success = () => {
    sfx('newdex');
    onRead();
    setPhase('ok');
  };

  useEffect(() => {
    if (phase !== 'listen') return;
    let live = true;
    setHearing(false);
    const l = listenFor(id, misses, () => live && setHearing(true));
    void l.result.then((r) => {
      if (!live) return;
      if (r === 'ok') success();
      else if (r === 'wrong' || r === 'silence') {
        sfx('error');
        setMisses((m) => m + 1);
        setPhase('again');
      } else {
        setNoMic(r === 'denied' ? 'denied' : 'broken');
        setPhase('adult');
      }
    });
    return () => {
      live = false;
      l.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, id]);

  // a moment to enjoy the stars, then back to the page
  useEffect(() => {
    if (phase !== 'ok') return;
    const t = setTimeout(() => closeRef.current(), 2600);
    return () => clearTimeout(t);
  }, [phase]);

  // once started, the reading is finished (no backing out until the ✕ shows); the stars can be skipped
  useInput(
    (e) => {
      if (phase === 'ok' && (e.btn === 'a' || e.btn === 'b')) onClose();
      else if (phase === 'listen' && canSkip && e.btn === 'b') skip();
    },
    LAYER_READ,
    phase === 'listen' || phase === 'ok',
  );

  const parts = syllables(name);
  return (
    <div className="dialog-backdrop read-backdrop">
      <div className={'panel dialog read-aloud ' + phase}>
        {canSkip && (
          // one ✕ only (B does the same; its key hint would be a second "X")
          <button className="read-close" onClick={skip} aria-label="Cerrar">
            <CrossMark size={26} />
          </button>
        )}
        {phase === 'listen' && (
          <>
            <FitText className="read-name">{name}</FitText>
            <div className={'read-mic' + (hearing ? ' on' : '')}>
              <MicIcon size={96} />
            </div>
          </>
        )}
        {phase === 'ok' && (
          <>
            <div className="read-stars">
              <StarIcon size={54} />
              <StarIcon size={78} />
              <StarIcon size={54} />
            </div>
            <FitText className="read-name">{name}</FitText>
            <p className="read-yay">¡Muy bien!</p>
          </>
        )}
        {(phase === 'again' || phase === 'adult') && (
          <>
            {phase === 'adult' && (
              <p className="read-note">
                <MicOffIcon size={30} /> {NO_MIC_NOTE[noMic]}
              </p>
            )}
            {phase === 'again' && DEBUG && <p className="read-note">Oído: {heardLastTime().map((t) => `«${t}»`).join(' ') || '(nada)'}</p>}
            <div className="read-syl">
              {parts.map((p, i) => (
                <span key={i} className={'syl c' + (i % 2)}>
                  {p}
                </span>
              ))}
            </div>
            {/* with a microphone the child just tries again; without one a grown-up confirms */}
            <Menu
              layer={LAYER_READ}
              className="read-menu"
              options={
                phase === 'again'
                  ? [{ label: 'Otra vez', icon: <MicIcon size={34} /> }]
                  : [{ label: 'Lo leyó bien', icon: <CheckMark size={30} />, sub: 'Lo dice un adulto' }]
              }
              onSelect={() => {
                if (phase === 'adult') success();
                else {
                  setPhase('listen');
                  setRound((r) => r + 1);
                }
              }}
              onBack={canSkip ? onSkip : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
