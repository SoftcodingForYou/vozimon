import { useEffect, useState } from 'react';
import { useInput } from '../system/input';
import { playMusic, sfx } from '../system/audio';
import { ballURL, genericURL } from '../art/assets';
import { LAYER, A, Bb, Qq, Ee, Tt, Mm, DirKeys, Sparkle, MicOffIcon } from './ui';
import { listenStatus } from '../system/listen';
import { SpeechCheck, useListenCheck } from './SpeechCheck';
import logoURL from '../../brand/svg/vozimon-logo.svg';

/** The check popped up on the way into the game already during this visit (it shouldn't nag every time). */
let checkShown = false;

/**
 * `needsMic`: reading aloud (the point of the game) or playing by voice is on, so if listening isn't
 * ready here a grown-up is told: a warning in the corner, and the check pops up once per visit when starting.
 */
export function TitleScreen({ onStart, needsMic = false }: { onStart: () => void; needsMic?: boolean }) {
  const [check] = useListenCheck(needsMic);
  const [micOpen, setMicOpen] = useState<false | 'tap' | 'start'>(false);
  const status = needsMic && check ? listenStatus(check) : 'ok';
  useEffect(() => {
    playMusic('title');
  }, []);

  const start = () => {
    sfx('ok');
    if (status !== 'ok' && !checkShown) {
      checkShown = true;
      setMicOpen('start'); // "Jugar" in it goes on into the game
    } else onStart();
  };

  useInput((e) => {
    if (e.btn === 'a') start();
  }, LAYER.screen);

  return (
    <>
      <Title onStart={start} warning={status === 'ok' ? null : status} onWarning={() => setMicOpen('tap')} />
      {micOpen && (
        <SpeechCheck
          closeLabel={micOpen === 'start' ? 'Jugar' : 'Volver'}
          onClose={() => {
            setMicOpen(false);
            if (micOpen === 'start') onStart();
          }}
        />
      )}
    </>
  );
}

function Title({ onStart: start, warning, onWarning }: { onStart: () => void; warning: 'setup' | 'none' | null; onWarning: () => void }) {
  return (
    <div className="screen title-screen" onClick={start}>
      {warning && (
        // for grown-ups: reading aloud won't work yet (tap for what's missing)
        <button
          className={'mic-warning ' + warning}
          onClick={(e) => {
            e.stopPropagation();
            onWarning();
          }}
        >
          <MicOffIcon size={22} />
          {warning === 'none' ? 'Este navegador no escucha' : 'Micrófono sin configurar'}
        </button>
      )}
      <div className="sky">
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />
        <div className="hill h1" />
        <div className="hill h2" />
        <Sparkle className="sparkle s1" color="var(--pink)" />
        <Sparkle className="sparkle s2" color="var(--paper)" />
        <Sparkle className="sparkle s3" color="var(--star)" />
        <Sparkle className="sparkle s4" color="var(--paper)" />
      </div>
      <h1 className="logo">
        <img src={logoURL} alt="Vozimón" draggable={false} />
      </h1>
      <p className="subtitle">¡Explora, encuentra y atrapa a los 151!</p>
      <div className="title-critters">
        <img className="pix critter k1" src={genericURL(1)} alt="" draggable={false} />
        <img className="pix title-ball" src={ballURL()} alt="Bola estrella" draggable={false} />
        <img className="pix critter k2" src={genericURL(13)} alt="" draggable={false} />
        <img className="pix critter k3" src={genericURL(45)} alt="" draggable={false} />
      </div>
      <p className="press blink">
        Pulsa <A /> para empezar
      </p>
      <p className="keys-help">
        <span>
          <DirKeys pair="ud" />
          <DirKeys pair="lr" /> caminar · <A /> aceptar · <Bb /> volver
        </span>
        <span>
          <Qq /> menú · <Ee /> vozidex · <Tt /> tipos · <Mm /> mapa
        </span>
      </p>
    </div>
  );
}
