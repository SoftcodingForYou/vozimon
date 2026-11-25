import { useEffect } from 'react';
import { useInput } from '../system/input';
import { playMusic, sfx } from '../system/audio';
import { ballURL, genericURL } from '../art/assets';
import { LAYER, A, Bb, Qq, Ee, Tt, Mm, DirKeys } from './ui';

export function TitleScreen({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    playMusic('title');
  }, []);

  const start = () => {
    sfx('ok');
    onStart();
  };

  useInput((e) => {
    if (e.btn === 'a') start();
  }, LAYER.screen);

  return (
    <div className="screen title-screen" onClick={start}>
      <div className="sky">
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />
        <div className="hill h1" />
        <div className="hill h2" />
      </div>
      <h1 className="logo">
        {'VOZIMÓN'.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.08}s` }}>
            {ch}
          </span>
        ))}
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
