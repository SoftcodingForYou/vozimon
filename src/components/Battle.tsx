import { useEffect, useRef, useState } from 'react';
import { getSpecies, MYTHICAL_ID, TOTAL, type Species } from '../game/creatures';
import { attackDamage, easyCatchChance, easyFleeChance, playerMaxHp, rollCatch, wildMaxHp } from '../game/battle';
import { byUse, type SaveSlot } from '../game/save';
import { mythicalUnlocked, type Encounter, type Outcome } from '../world/world';
import { BIOME_BG } from '../world/tiles';
import { avatarBackURL, ballURL, portraitBounds, portraitURL } from '../art/assets';
import { attackSfx, playMusic, sfx } from '../system/audio';
import { attackRecipe } from '../game/attacks';
import { Menu, TextBox, LAYER, TypeBadge, HpBar, BallIcon, type Opt } from './ui';
import { CreaturePicker } from './CreaturePicker';
import { Dex } from './Dex';
import { AttackFx, KoStars, fxHitDelay } from './AttackFx';

type UI =
  | { k: 'none'; n: number }
  | { k: 'text'; n: number; text: string; auto?: number; ball?: boolean; done: () => void }
  | { k: 'menu'; n: number; prompt: string; options: Opt[]; done: (i: number) => void }
  | { k: 'pick'; n: number; title: string; allowCancel: boolean; exclude: number[]; current: number | null; done: (id: number | null) => void }
  | { k: 'dex'; n: number; done: () => void };

type SpriteAnim = 'enter' | 'idle' | 'lunge' | 'hit' | 'faint' | 'tired' | 'ko' | 'absorb' | 'appear' | 'flee' | 'leave' | 'hidden';
type BallAnim = 'none' | 'throw' | 'land' | 'wobble' | 'caught' | 'open';

interface Props {
  enc: Encounter;
  slot: SaveSlot;
  onSeen: (id: number) => void;
  onCaught: (id: number) => void;
  onFight: (id: number) => void; // one of the child's Vozimón was sent out to fight
  onWin: (id: number) => void; // ...and knocked out the wild one
  onEnd: (o: Outcome) => void;
  reading?: boolean; // names can be read out loud on the new Vozidex page
  onRead?: (id: number) => void;
}

const pickOne = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function Battle({ enc, slot, onSeen, onCaught, onFight, onWin, onEnd, reading = false, onRead }: Props) {
  const wild = getSpecies(enc.sp);
  const init = useRef({
    easy: slot.mode === 'easy' || slot.caught.length === 0,
    // most used fighters first; the order stays the same for the whole battle
    team: byUse(slot.caught, slot.record),
    record: slot.record,
    wasSeen: slot.seen.includes(enc.sp),
    wasCaught: slot.caught.includes(enc.sp),
    caughtBefore: slot.caught.length,
  }).current;
  const { easy, team } = init;

  const counter = useRef(0);
  const next = () => ++counter.current;
  const [ui, setUi] = useState<UI>({ k: 'none', n: 0 });
  const [wildHp, setWildHp] = useState(wildMaxHp(wild));
  const [mine, setMine] = useState<number | null>(null);
  const [mineHp, setMineHp] = useState(0);
  const [wildAnim, setWildAnim] = useState<{ a: SpriteAnim; n: number }>({ a: 'enter', n: 0 });
  const [mineAnim, setMineAnim] = useState<{ a: SpriteAnim; n: number }>({ a: 'hidden', n: 0 });
  const [ball, setBall] = useState<{ a: BallAnim; n: number }>({ a: 'none', n: 0 });
  const [fx, setFx] = useState<{ from: 'mine' | 'wild'; sp: number; strong: boolean; n: number } | null>(null);
  const [shake, setShake] = useState(false);
  const [newBadge, setNewBadge] = useState(false);
  const started = useRef(false);
  const cbs = useRef({ onSeen, onCaught, onFight, onWin, onEnd });
  cbs.current = { onSeen, onCaught, onFight, onWin, onEnd };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const animWild = (a: SpriteAnim) => setWildAnim({ a, n: next() });
    const animMine = (a: SpriteAnim) => setMineAnim({ a, n: next() });
    const animBall = (a: BallAnim) => setBall({ a, n: next() });
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    /** A message; `ball`: continuing throws the star ball (shown next to the arrow). */
    const text = (t: string, auto?: number, ball?: boolean) =>
      new Promise<void>((r) =>
        setUi({
          k: 'text',
          n: next(),
          text: t,
          auto,
          ball,
          done: () => {
            setUi({ k: 'none', n: next() });
            r();
          },
        }),
      );
    const auto = (t: string) => text(t, 850);
    const choose = (prompt: string, options: Opt[]) =>
      new Promise<number>((r) =>
        setUi({
          k: 'menu',
          n: next(),
          prompt,
          options,
          done: (i) => {
            setUi({ k: 'none', n: next() });
            r(i);
          },
        }),
      );
    const pick = (title: string, allowCancel: boolean, exclude: number[], current: number | null) =>
      new Promise<number | null>((r) =>
        setUi({
          k: 'pick',
          n: next(),
          title,
          allowCancel,
          exclude,
          current,
          done: (id) => {
            setUi({ k: 'none', n: next() });
            r(id);
          },
        }),
      );

    /** The Vozidex page of a newly caught creature (Action or Cancel continues). */
    const dexPage = () =>
      new Promise<void>((r) =>
        setUi({
          k: 'dex',
          n: next(),
          done: () => {
            setUi({ k: 'none', n: next() });
            r();
          },
        }),
      );

    const runAway = async () => {
      sfx('flee');
      await text('¡Escapaste sin problemas!');
      cbs.current.onEnd('ran');
    };

    const throwBall = async (res: { shakes: number; caught: boolean }) => {
      sfx('throw');
      animBall('throw');
      await wait(700);
      animWild('absorb');
      animBall('land');
      await wait(700);
      for (let i = 0; i < res.shakes; i++) {
        animBall('wobble');
        sfx('wobble');
        await wait(820);
      }
      if (res.caught) {
        animBall('caught');
        sfx('caught');
        await wait(1100);
      } else {
        animBall('open');
        animWild('appear');
        sfx('breakout');
        await wait(600);
        animBall('none');
        animWild('idle');
      }
    };

    const celebrate = async () => {
      cbs.current.onCaught(wild.id);
      await text(`¡Bien! ¡Has atrapado a ${wild.name}!`);
      if (!init.wasCaught) {
        sfx('newdex');
        await text(`¡${wild.name} se ha guardado en tu Vozidex!`);
        await dexPage(); // its new Vozidex page, before going back to the world
        if (wild.id !== MYTHICAL_ID && !slot.allUnlocked && !mythicalUnlocked(slot.caught) && mythicalUnlocked([...slot.caught, wild.id])) {
          sfx('newdex');
          await text('¡Has atrapado a los 150! Ahora un Vozimón misterioso pasea por todo el mundo. ¡Búscalo en el mapa!');
        }
        if (init.caughtBefore + 1 >= TOTAL) await text('¡Increíble! ¡Has completado el Vozidex entero! ¡Eres una gran exploradora o un gran explorador!');
      } else {
        await text(`Ya tenías a ${wild.name} en tu Vozidex. ¡Ahora tiene un amigo más!`);
      }
      cbs.current.onEnd('caught');
    };

    const easyLoop = async () => {
      if (slot.mode === 'normal') await text('Todavía no tienes Vozimón para luchar. ¡Lanza la bola estrella!');
      for (;;) {
        const c = await choose('¿Qué hacemos?', [{ label: 'Lanzar bola', icon: <BallIcon size={30} /> }, { label: 'Huir' }]);
        if (c === 1) return runAway();
        const res = rollCatch(easyCatchChance(wild.id), Math.random);
        await throwBall(res);
        if (res.caught) return celebrate();
        await text(pickOne(['¡Oh, no! ¡Se ha escapado de la bola!', '¡Casi! ¡Por muy poquito!', '¡Uy! ¡Se ha soltado!']));
        if (Math.random() < easyFleeChance(wild.id)) {
          sfx('flee');
          animWild('flee');
          await text(`¡${wild.name} se fue corriendo!`);
          cbs.current.onEnd('fled');
          return;
        }
        await auto('¡Inténtalo otra vez!');
      }
    };

    const normalLoop = async () => {
      const fainted = new Set<number>();
      const counted = new Set<number>(); // each fighter counts one fight per battle
      let current: number | null = null;
      let cur: Species = wild;
      let curHp = 0;
      let wHp = wildMaxHp(wild);

      const sendOut = async (id: number) => {
        if (!counted.has(id)) {
          counted.add(id);
          cbs.current.onFight(id);
        }
        current = id;
        cur = getSpecies(id);
        curHp = playerMaxHp(cur);
        setMine(id);
        setMineHp(curHp);
        animMine('enter');
        sfx('ok');
        await auto(`¡Adelante, ${cur.name}!`);
        animMine('idle');
      };

      const doAttack = async (fromMine: boolean): Promise<boolean> => {
        const att = fromMine ? cur : wild;
        const def = fromMine ? wild : cur;
        const type = att.types[0];
        await auto(`¡${att.name} usa ${att.attack}!`);
        const hit = attackDamage(att, def, fromMine, Math.random);
        if (fromMine) animMine('lunge');
        else animWild('lunge');
        const recipe = attackRecipe(att.id);
        attackSfx(type, recipe);
        setFx({ from: fromMine ? 'mine' : 'wild', sp: att.id, strong: hit.mult > 1, n: next() });
        await wait(fxHitDelay(att.id));
        sfx(hit.mult > 1 ? 'super' : hit.mult < 1 ? 'weak' : 'hit');
        if (hit.mult > 1 || hit.crit || recipe.shake) {
          setShake(true);
          setTimeout(() => setShake(false), 420);
        }
        if (fromMine) {
          wHp = Math.max(0, wHp - hit.damage);
          setWildHp(wHp);
          animWild('hit');
        } else {
          curHp = Math.max(0, curHp - hit.damage);
          setMineHp(curHp);
          animMine('hit');
        }
        await wait(750);
        setFx(null);
        if (fromMine) {
          animMine('idle');
          if (wHp > 0) animWild('idle');
        } else {
          animWild('idle');
          if (curHp > 0) animMine('idle');
        }
        if (hit.crit) await auto('¡Un golpe crítico!');
        if (hit.mult > 1) await auto('¡Es muy eficaz!');
        else if (hit.mult < 1) await auto('No es muy eficaz...');
        return fromMine ? wHp <= 0 : curHp <= 0;
      };

      // Returns false when nobody can fight any more.
      const mineFainted = async (): Promise<boolean> => {
        sfx('faint');
        animMine('ko');
        await text(`¡${cur.name} está K.O.! Necesita descansar.`);
        animMine('faint');
        await wait(450);
        fainted.add(current!);
        setMine(null);
        if (fainted.size >= team.length) {
          await text(`Tus Vozimón necesitan descansar. ${wild.name} se fue corriendo.`);
          animWild('flee');
          await wait(500);
          cbs.current.onEnd('lost');
          return false;
        }
        const id = await pick('¿Quién sigue luchando?', false, [...fainted], null);
        await sendOut(id!);
        return true;
      };

      while (current === null) {
        const c = await choose('¿Qué hacemos?', [{ label: '¡A luchar!' }, { label: 'Huir' }]);
        if (c === 1) return runAway();
        const id = await pick('¿Quién va a luchar?', true, [], null);
        if (id !== null) await sendOut(id);
      }

      for (;;) {
        const act = await choose(`¿Qué hace ${cur.name}?`, [
          { label: cur.attack, after: <TypeBadge type={cur.types[0]} small /> },
          { label: 'Cambiar' },
          { label: 'Huir' },
        ]);
        if (act === 2) return runAway();
        if (act === 1) {
          const id = await pick('¿Quién quieres que luche?', true, [...fainted, current!], current);
          if (id === null) continue;
          animMine('leave');
          await auto(`¡Vuelve, ${cur.name}!`);
          await sendOut(id);
          if (await doAttack(false)) {
            if (!(await mineFainted())) return;
          }
          continue;
        }
        if (await doAttack(true)) {
          cbs.current.onWin(current!);
          sfx('faint');
          animWild('tired');
          // Catching is sure now, so no menu: Action or Cancel throws the ball right away.
          await text(`¡${wild.name} está K.O.! ¡Lanza la bola estrella!`, undefined, true);
          await throwBall({ shakes: 3, caught: true });
          return celebrate();
        }
        if (await doAttack(false)) {
          if (!(await mineFainted())) return;
        }
      }
    };

    const run = async () => {
      playMusic('battle');
      cbs.current.onSeen(wild.id);
      await wait(750);
      animWild('idle');
      if (!init.wasSeen) {
        setNewBadge(true);
        sfx('newdex');
      }
      await text(init.wasSeen ? `¡Mira! ¡Un ${wild.name} salvaje!` : `¡Mira! ¡Un ${wild.name} salvaje! ¡Es la primera vez que lo ves!`);
      if (wild.mythical && !easy) await text('¡Cuidado! Es cinco veces más fuerte que los demás Vozimón. ¡Tus compañeros tendrán que turnarse!');
      if (easy) await easyLoop();
      else await normalLoop();
    };

    run().catch((err) => {
      console.error(err);
      cbs.current.onEnd('ran');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mineSp = mine !== null ? getSpecies(mine) : null;
  const habitat = BIOME_BG[enc.biome] ?? 'pradera';
  // Dizzy stars sit on top of the head (portraits are 56 px, shown at 3.5x / 4x).
  const wildHead = portraitBounds(wild.id);
  const mineHead = mineSp ? portraitBounds(mineSp.id) : null;

  return (
    <div className={'battle bg-' + habitat + (shake ? ' shake' : '')}>
      <div className="platform wild-platform" />
      <div className="platform mine-platform" />

      <div key={'w' + wildAnim.n} className={'bsprite wild anim-' + wildAnim.a}>
        <img className="pix" src={portraitURL(wild.id)} alt={wild.name} draggable={false} />
        {wildAnim.a === 'tired' && <KoStars x={wildHead.cx * 3.5} y={wildHead.top * 3.5 - 8} />}
      </div>

      {mineSp ? (
        <div key={'m' + mineAnim.n} className={'bsprite mine anim-' + mineAnim.a}>
          <img className="pix flip" src={portraitURL(mineSp.id)} alt={mineSp.name} draggable={false} />
          {mineAnim.a === 'ko' && mineHead && <KoStars x={(56 - mineHead.cx) * 4} y={mineHead.top * 4 - 8} />}
        </div>
      ) : easy ? (
        <div className="trainer">
          <img className="pix" src={avatarBackURL(slot.avatar)} alt="" draggable={false} />
        </div>
      ) : null}

      {ball.a !== 'none' && (
        <div key={'b' + ball.n} className={'bball ball-' + ball.a}>
          <img className="pix" src={ballURL()} alt="" draggable={false} />
          {ball.a === 'caught' && (
            <span className="stars">
              <i />
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
      )}

      {fx && <AttackFx key={'f' + fx.n} from={fx.from} sp={fx.sp} strong={fx.strong} />}

      <div className="panel binfo wild-info">
        <div className="binfo-name">
          {wild.name}
          {newBadge && <span className="new-badge">¡NUEVO!</span>}
          {init.wasCaught && <BallIcon size={26} />}
        </div>
        <div className="binfo-types">
          {wild.types.map((t) => (
            <TypeBadge key={t} type={t} small />
          ))}
        </div>
        {!easy && <HpBar value={wildHp} max={wildMaxHp(wild)} />}
      </div>

      {mineSp && (
        <div className="panel binfo mine-info">
          <div className="binfo-name">{mineSp.name}</div>
          <HpBar value={mineHp} max={playerMaxHp(mineSp)} />
          <div className="hp-num">
            {mineHp} / {playerMaxHp(mineSp)}
          </div>
        </div>
      )}

      <div className="bbottom">
        {ui.k === 'text' && (
          <TextBox key={ui.n} text={ui.text} auto={ui.auto} onDone={ui.done} layer={LAYER.battle}>
            {ui.ball && (
              <span className="tb-ball">
                <BallIcon size={38} />
              </span>
            )}
          </TextBox>
        )}
        {ui.k === 'menu' && (
          <div className="bmenu">
            <div className="textbox prompt">
              <p>{ui.prompt}</p>
            </div>
            <div className="panel bmenu-opts">
              <Menu key={ui.n} options={ui.options} onSelect={ui.done} layer={LAYER.battle} oneLine />
            </div>
          </div>
        )}
        {(ui.k === 'none' || ui.k === 'pick' || ui.k === 'dex') && <div className="textbox empty" />}
      </div>

      {ui.k === 'pick' && (
        <CreaturePicker
          key={ui.n}
          team={team}
          wild={wild}
          exclude={ui.exclude}
          current={ui.current}
          title={ui.title}
          allowCancel={ui.allowCancel}
          record={slot.record}
          onDone={ui.done}
        />
      )}
      {ui.k === 'dex' && (
        <Dex
          key={ui.n}
          slot={{
            ...slot,
            seen: slot.seen.includes(wild.id) ? slot.seen : [...slot.seen, wild.id],
            caught: slot.caught.includes(wild.id) ? slot.caught : [...slot.caught, wild.id],
          }}
          only={wild.id}
          reading={reading}
          onRead={onRead}
          onClose={ui.done}
        />
      )}
    </div>
  );
}
