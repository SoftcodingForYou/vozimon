// Preview of all 151 signature attacks (?demo=attacks), one after another at normal speed.
// Arrows: previous / next, A: replay. With &capture the page waits for a recorder that steps
// through it frame by frame (window.__fx), used to make the presentation video.

import { useEffect, useState, type CSSProperties } from 'react';
import { getSpecies, TOTAL, dexNumber } from '../game/creatures';
import { attackHitDelay, attackRecipe } from '../game/attacks';
import { portraitURL } from '../art/assets';
import { attackSfx, renderSfxToWav, sfx } from '../system/audio';
import { useInput } from '../system/input';
import { AttackFx } from './AttackFx';
import { LAYER, TypeBadge } from './ui';

/** Each attack gets the same time slot in the preview (ms), and starts T0 into it. */
export const CLIP = 2600;
const T0 = 350;

/** An original practice target the attacks are aimed at (no creature gets hurt). */
function PracticeTarget() {
  return (
    <svg width="196" height="196" viewBox="0 0 100 100" aria-label="Diana de práctica">
      <rect x="45" y="58" width="10" height="38" rx="2" fill="#a0703a" stroke="#2a2238" strokeWidth="2" />
      <rect x="30" y="90" width="40" height="7" rx="3" fill="#8a5a32" stroke="#2a2238" strokeWidth="2" />
      <circle cx="50" cy="44" r="30" fill="#fffdf4" stroke="#2a2238" strokeWidth="3" />
      <circle cx="50" cy="44" r="22" fill="#e44a40" />
      <circle cx="50" cy="44" r="14" fill="#fffdf4" />
      <circle cx="50" cy="44" r="7" fill="#e44a40" />
    </svg>
  );
}

declare global {
  interface Window {
    __fx?: { count: number; clip: number; show: (i: number) => Promise<void>; seek: (ms: number) => void; audio: () => Promise<string> };
  }
}

export function AttackShowcase({ capture, start = 1 }: { capture: boolean; start?: number }) {
  const [i, setI] = useState(Math.max(0, Math.min(TOTAL - 1, start - 1)));
  const [run, setRun] = useState(0);
  const sp = i + 1;
  const s = getSpecies(sp);
  const rc = attackRecipe(sp);
  const hit = attackHitDelay(rc);

  // Play: sound in time with the picture, then on to the next attack.
  useEffect(() => {
    if (capture) return;
    const timers = [
      setTimeout(() => attackSfx(s.types[0], rc), T0),
      setTimeout(() => sfx('hit'), T0 + hit),
      setTimeout(() => setI((k) => (k + 1) % TOTAL), CLIP),
    ];
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, run, capture]);

  useInput((e) => {
    if (e.btn === 'right' || e.btn === 'down') setI((k) => (k + 1) % TOTAL);
    else if (e.btn === 'left' || e.btn === 'up') setI((k) => (k + TOTAL - 1) % TOTAL);
    else if (e.btn === 'a') setRun((r) => r + 1);
  }, LAYER.screen);

  // Recorder hook: show an attack, then seek every animation to a moment of its slot.
  useEffect(() => {
    if (!capture) return;
    window.__fx = {
      count: TOTAL,
      clip: CLIP,
      show: (k) =>
        new Promise((res) => {
          setI(k);
          requestAnimationFrame(() => requestAnimationFrame(() => res()));
        }),
      seek: (ms) => {
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = ms;
        }
      },
      // the whole soundtrack, in sync with the slots, as a WAV data URL
      audio: async () => {
        const blob = await renderSfxToWav((TOTAL * CLIP) / 1000 + 1, () => {
          for (let k = 0; k < TOTAL; k++) {
            const sk = getSpecies(k + 1);
            const rk = attackRecipe(k + 1);
            const at = (k * CLIP + T0) / 1000;
            attackSfx(sk.types[0], rk, at);
            sfx('hit', at + attackHitDelay(rk) / 1000);
          }
        });
        return await new Promise<string>((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.readAsDataURL(blob);
        });
      },
    };
  }, [capture]);

  const shake = rc.shake ? ({ animation: `battleShake 0.4s linear ${T0 + hit}ms both` } as CSSProperties) : undefined;
  return (
    <div key={`${i}-${run}`} className={'battle showcase bg-' + s.habitats[0]} style={shake}>
      <div className="platform wild-platform" />
      <div className="platform mine-platform" />
      <div className="bsprite wild" style={{ animation: `hit 0.7s linear ${T0 + hit}ms` }}>
        <PracticeTarget />
      </div>
      <div className="bsprite mine" style={{ animation: `lungeR 0.45s ease-in-out ${T0}ms` }}>
        <img className="pix flip" src={portraitURL(sp)} alt={s.name} draggable={false} />
      </div>
      <AttackFx from="mine" sp={sp} strong={false} t0={T0} />
      <div className="panel sc-counter">
        {dexNumber(sp)} · {sp}/{TOTAL}
      </div>
      <div className="bbottom">
        <div className="textbox sc-text">
          <p>
            ¡{s.name} usa <b>{s.attackName}</b>!
          </p>
          <span className="sc-types">
            {s.types.map((t) => (
              <TypeBadge key={t} type={t} small />
            ))}
          </span>
        </div>
      </div>
      {!capture && <span className="sc-hint">← → cambiar · A repetir</span>}
    </div>
  );
}
