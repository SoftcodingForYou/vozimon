// Shared UI pieces: option lists, text boxes, badges and icons.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useBindings, useInput, useInputSource, type Btn, type InputEvt } from '../system/input';
import { retryVoice, useVoice, useVoiceHeard, useVoiceState } from '../system/voice';
import { onMicLevel } from '../system/micLevel';
import { keyLabel } from '../system/keys';
import { sfx } from '../system/audio';
import { ELEMS, type Elem } from '../game/elements';
import { ballURL } from '../art/assets';

export const LAYER = {
  world: 0,
  screen: 10,
  overlay: 20,
  dex: 30,
  battle: 40,
  picker: 50,
  dialog: 60,
} as const;

export interface Opt {
  label: string;
  icon?: ReactNode;
  sub?: string;
  after?: ReactNode; // shown after the label (e.g. a type badge)
  disabled?: boolean;
  className?: string;
  say?: readonly string[]; // playing by voice: the words that choose it (default: its label)
}

interface MenuProps {
  options: Opt[];
  onSelect: (i: number) => void;
  onBack?: () => void;
  layer: number;
  active?: boolean;
  initial?: number;
  columns?: number;
  className?: string;
  onFocus?: (i: number) => void;
  closeBtn?: Btn; // another button that closes the menu like B (e.g. the menu key itself)
  oneLine?: boolean; // each option stays on one line, shrunk to fit (small boxes like in battle)
  scroll?: boolean; // a long list: show our always-visible scroll bar beside it
  voice?: boolean; // playing by voice: saying an option's word chooses it
  render?: (o: Opt, i: number, selected: boolean) => ReactNode;
}

/** A list (or grid) of options driven by arrows + A/B, mouse and touch (and the voice, with `voice`). */
export function Menu({
  options,
  onSelect,
  onBack,
  layer,
  active = true,
  initial = 0,
  columns = 1,
  className,
  onFocus,
  closeBtn,
  oneLine,
  scroll,
  voice = false,
  render,
}: MenuProps) {
  const [idx, setIdx] = useState(Math.min(initial, options.length - 1));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (idx >= options.length) setIdx(Math.max(0, options.length - 1));
  }, [options.length, idx]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
    onFocus?.(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const move = (d: number) => {
    const n = options.length;
    if (!n) return;
    let ni = idx + d;
    if (columns > 1 && Math.abs(d) === columns) {
      if (ni < 0 || ni >= n) return;
    } else {
      ni = (ni + n) % n;
    }
    if (ni !== idx) {
      sfx('move');
      setIdx(ni);
    }
  };

  const choose = (i: number) => {
    const o = options[i];
    if (!o) return;
    if (o.disabled) {
      sfx('error');
      return;
    }
    sfx('ok');
    onSelect(i);
  };

  useVoice(
    {
      cmds: options.flatMap((o, i) =>
        o.disabled
          ? []
          : [
              {
                words: o.say ?? [o.label],
                show: o.label,
                run: () => {
                  setIdx(i);
                  choose(i);
                },
              },
            ],
      ),
    },
    layer,
    active && voice,
  );

  useInput(
    (e: InputEvt) => {
      if (e.btn === 'up') move(-columns);
      else if (e.btn === 'down') move(columns);
      else if (e.btn === 'left') move(columns > 1 ? -1 : 0);
      else if (e.btn === 'right') move(columns > 1 ? 1 : 0);
      else if (e.btn === 'a') choose(idx);
      else if ((e.btn === 'b' || (closeBtn && e.btn === closeBtn)) && onBack) {
        sfx('back');
        onBack();
      }
    },
    layer,
    active,
  );

  const list = (
    <div
      ref={listRef}
      className={'menu ' + (scroll ? 'scrolls ' : '') + (className ?? '')}
      style={columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((o, i) => (
        <div
          key={i}
          data-idx={i}
          className={'opt' + (i === idx ? ' sel' : '') + (o.disabled ? ' disabled' : '') + (o.className ? ' ' + o.className : '')}
          onPointerEnter={(e) => {
            if (e.pointerType === 'mouse' && i !== idx) setIdx(i);
          }}
          onClick={() => {
            setIdx(i);
            choose(i);
          }}
        >
          {render ? (
            render(o, i, i === idx)
          ) : (
            <>
              <span className="cursor">{i === idx ? '▶' : ''}</span>
              {o.icon && <span className="opt-icon">{o.icon}</span>}
              {oneLine ? (
                <FitText className="opt-label left">
                  {o.label}
                  {o.sub && <small>{o.sub}</small>}
                  {o.after}
                </FitText>
              ) : (
                <span className="opt-label">
                  {o.label}
                  {o.sub && <small>{o.sub}</small>}
                  {o.after}
                </span>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
  if (!scroll) return list;
  return (
    <div className="scroll-wrap">
      {list}
      <ScrollBar target={listRef} />
    </div>
  );
}

/**
 * An always-visible scroll bar for a scrolling list. Children don't discover content hidden
 * below the edge, and iOS hides its own scroll bars, so long lists show this one (only when
 * they really overflow). It follows the list and can be dragged or tapped.
 */
export function ScrollBar({ target, className }: { target: React.RefObject<HTMLElement>; className?: string }) {
  const [m, setM] = useState({ show: false, top: 0, size: 1 });
  const track = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = target.current;
    if (!el) return;
    const update = () => {
      const show = el.scrollHeight > el.clientHeight + 2;
      const size = Math.min(1, el.clientHeight / Math.max(1, el.scrollHeight));
      const top = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
      setM((o) => (o.show === show && Math.abs(o.top - top) < 0.002 && Math.abs(o.size - size) < 0.002 ? o : { show, top, size }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    for (const c of Array.from(el.children)) ro?.observe(c);
    void document.fonts?.ready.then(update);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [target]);

  const scrollTo = (clientY: number) => {
    const el = target.current;
    const t = track.current;
    if (!el || !t) return;
    const r = t.getBoundingClientRect();
    const thumb = r.height * m.size;
    const k = Math.max(0, Math.min(1, (clientY - r.top - thumb / 2) / Math.max(1, r.height - thumb)));
    el.scrollTop = k * (el.scrollHeight - el.clientHeight);
  };

  if (!m.show) return null;
  return (
    <div
      ref={track}
      className={'scrollbar ' + (className ?? '')}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        scrollTo(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) scrollTo(e.clientY);
      }}
    >
      <div className="scrollbar-thumb" style={{ top: `${m.top * (1 - m.size) * 100}%`, height: `${m.size * 100}%` }} />
    </div>
  );
}

interface TextBoxProps {
  text: string;
  onDone: () => void;
  layer: number;
  auto?: number; // ms to wait after typing before continuing by itself
  hold?: boolean; // stays until the game takes it away (e.g. the attack's name during its animation)
  className?: string;
  children?: ReactNode;
}

/** Text that appears letter by letter; A (or a tap) continues. */
export function TextBox({ text, onDone, layer, auto, hold = false, className, children }: TextBoxProps) {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  const full = shown >= text.length;

  useEffect(() => {
    setShown(0);
    doneRef.current = false;
  }, [text]);

  useEffect(() => {
    if (full) return;
    const t = setTimeout(() => setShown((s) => Math.min(text.length, s + 2)), 28);
    return () => clearTimeout(t);
  }, [shown, full, text]);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  // Auto-continue a moment after the whole text is shown.
  useEffect(() => {
    if (!full || auto === undefined) return;
    const t = setTimeout(finish, auto);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, auto, text]);

  const advance = () => {
    if (hold) return;
    if (!full) setShown(text.length);
    else {
      sfx('move');
      finish();
    }
  };

  useInput(
    (e) => {
      if (e.btn === 'a' || e.btn === 'b') advance();
    },
    layer,
    !hold,
  );

  return (
    <div className={'textbox ' + (hold ? 'held ' : '') + (className ?? '')} onClick={advance}>
      <p>{text.slice(0, shown)}</p>
      {children}
      {full && auto === undefined && !hold && <span className="next">▼</span>}
    </div>
  );
}

/**
 * One line that shrinks (never cuts) to fit its box: creature names are reading practice,
 * so they must always be shown whole, whatever letter style or capitals the player chose.
 */
export function FitText({ children, className }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const k = Math.min(1, o.clientWidth / Math.max(1, i.offsetWidth));
      i.style.transform = k < 0.995 ? `scale(${k})` : '';
    };
    fit();
    // Fires again when the font finishes loading or the letter style changes.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(i);
    ro?.observe(o);
    return () => ro?.disconnect();
  }, [children]);
  return (
    <span ref={outer} className={'fit ' + (className ?? '')}>
      <span ref={inner} className="fit-in">
        {children}
      </span>
    </span>
  );
}

// Little pictures for the types (fire, drop, leaf...) for children who can't read yet.
const TYPE_ICONS: Record<Elem, ReactNode> = {
  normal: <circle cx="8" cy="8" r="4.8" fill="currentColor" />,
  fuego: (
    <path
      fill="currentColor"
      d="M8 1 C9.5 4 13 6 12.5 10 C12 13.5 9.8 15 8 15 C5.6 15 3.5 13.2 3.5 10.5 C3.5 8 5.5 6.8 6 4.5 C7 6 7.5 7 7.2 8.6 C8.8 7 9 4 8 1 Z"
    />
  ),
  agua: <path fill="currentColor" d="M8 1.5 C10 5 13 7.8 13 10.8 C13 13.3 10.8 15 8 15 C5.2 15 3 13.3 3 10.8 C3 7.8 6 5 8 1.5 Z" />,
  planta: (
    <>
      <path fill="currentColor" d="M2.5 13.5 C2.5 6.5 7 2.5 13.8 2.2 C14 9 9.5 13.5 2.5 13.5 Z" />
      <path fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.2" d="M3.5 12.5 L10.5 5.5" />
    </>
  ),
  electrico: <path fill="currentColor" d="M9.5 1 L3.5 9 H7.5 L6 15 L12.5 6.5 H8.5 L10.5 1 Z" />,
  hielo: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      d="M8 1.5 V14.5 M2.4 4.75 L13.6 11.25 M2.4 11.25 L13.6 4.75 M6 2.5 L8 4.3 L10 2.5 M6 13.5 L8 11.7 L10 13.5"
    />
  ),
  roca: <path fill="currentColor" d="M2 12.5 L3.5 6.5 L7.5 3 L12.5 4.5 L14.5 10.5 L11 14 L5 14 Z" />,
  aire: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      d="M1.8 6 H10 A2.3 2.3 0 1 0 7.9 3.3 M1.8 10 H12.4 A2.1 2.1 0 1 1 10.6 12.8"
    />
  ),
  bicho: (
    <>
      <ellipse cx="8" cy="9.6" rx="4.3" ry="5" fill="currentColor" />
      <path fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" d="M6.3 4.8 L4.2 1.6 M9.7 4.8 L11.8 1.6" />
    </>
  ),
  fantasma: (
    <path fill="currentColor" d="M3 15 V7.5 C3 4.2 5.2 2 8 2 C10.8 2 13 4.2 13 7.5 V15 L11.3 13.3 L9.6 15 L8 13.3 L6.4 15 L4.7 13.3 Z" />
  ),
  lucha: (
    <>
      <path fill="currentColor" d="M2.8 7.2 C2.8 5.6 3.9 5 5 5 H11.4 C12.8 5 13.6 6 13.6 7.3 V11 C13.6 13.1 12 14.6 9.9 14.6 H6 C4.1 14.6 2.8 13.2 2.8 11.4 Z" />
      <path fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1" d="M6.2 5 V8.4 M9 5 V8.4 M11.6 5.2 V8.4" />
    </>
  ),
  dragon: (
    <path fill="currentColor" d="M2 13.5 C3.5 8 7.5 3.2 14 2 C12.5 4.8 13.2 6.6 11.4 8.4 C12.6 9.6 11.6 11.6 9.6 11.6 C9.6 13 7.2 14.2 2 13.5 Z" />
  ),
  magia: <path fill="currentColor" d="M8 1.2 L9.9 5.6 L14.6 6 L11 9.1 L12.1 13.8 L8 11.3 L3.9 13.8 L5 9.1 L1.4 6 L6.1 5.6 Z" />,
};

export function TypeIcon({ type, size = 16 }: { type: Elem; size?: number }) {
  return (
    <svg className="type-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {TYPE_ICONS[type]}
    </svg>
  );
}

export function TypeBadge({ type, small }: { type: Elem; small?: boolean }) {
  const t = ELEMS[type];
  return (
    <span className={'type-badge' + (small ? ' small' : '')} style={{ background: t.color, color: t.text }}>
      <TypeIcon type={type} size={small ? 13 : 17} />
      {t.name}
    </span>
  );
}

export function BallIcon({ size = 24, grey = false }: { size?: number; grey?: boolean }) {
  return <img className="pix" src={ballURL(grey)} width={size} height={size} alt={grey ? 'no atrapado' : 'atrapado'} draggable={false} />;
}

/** The brand's four-pointed sparkle (ink outline), e.g. twinkling in the title sky. */
export function Sparkle({ className, color, size = 40 }: { className?: string; color: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 Q14.2 9.8 22 12 Q14.2 14.2 12 22 Q9.8 14.2 2 12 Q9.8 9.8 12 2 Z" fill={color} stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** A little trophy cup, for the wins. */
export function CupIcon({ size = 15 }: { size?: number }) {
  return (
    <svg className="cup" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="#f8c838"
        stroke="#2a2238"
        strokeWidth="1.2"
        strokeLinejoin="round"
        d="M4 2 H12 V6 C12 8.6 10.2 10 8 10 C5.8 10 4 8.6 4 6 Z M7 10 H9 V12 H11 V14.5 H5 V12 H7 Z"
      />
      <path fill="none" stroke="#2a2238" strokeWidth="1.2" d="M4 3.5 H2 C2 6 3 7 4.4 7.2 M12 3.5 H14 C14 6 13 7 11.6 7.2" />
    </svg>
  );
}

/** A microphone: reading a name out loud. */
export function MicIcon({ size = 24 }: { size?: number }) {
  return (
    <svg className="mic" width={size} height={size} viewBox="0 0 16 16" aria-label="micrófono">
      <rect x="5.2" y="1" width="5.6" height="9" rx="2.8" fill="#e8505b" stroke="#2a2238" strokeWidth="1.2" />
      <rect x="6.4" y="2.4" width="1.2" height="3" rx="0.6" fill="#ffffff" opacity="0.8" />
      <path d="M3.2 7.2 C3.2 10.4 5.4 12 8 12 C10.6 12 12.8 10.4 12.8 7.2 M8 12 V14.6 M5.4 14.8 H10.6" fill="none" stroke="#2a2238" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** A crossed-out microphone: this browser / device can't listen right now. */
export function MicOffIcon({ size = 24 }: { size?: number }) {
  return (
    <svg className="mic-off" width={size} height={size} viewBox="0 0 16 16" aria-label="sin micrófono">
      <rect x="5.2" y="1" width="5.6" height="9" rx="2.8" fill="#b8b0c4" stroke="#2a2238" strokeWidth="1.2" />
      <path d="M3.2 7.2 C3.2 10.4 5.4 12 8 12 C10.6 12 12.8 10.4 12.8 7.2 M8 12 V14.6 M5.4 14.8 H10.6" fill="none" stroke="#2a2238" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 2 L14 14" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M2 2 L14 14" stroke="#e44a40" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * How loud the microphone hears things, on an element: the CSS variable `--lvl` (0..1) and the
 * attribute `data-speaking` (the recogniser hears a voice). Updated every frame, without re-rendering.
 */
export function useMicLevel(ref: React.RefObject<HTMLElement>) {
  useEffect(
    () =>
      onMicLevel((lvl, speech) => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--lvl', lvl.toFixed(3));
        el.toggleAttribute('data-speaking', speech);
      }),
    [ref],
  );
}

/**
 * Playing by voice: the microphone that shows the game is listening (a glow behind it grows with
 * how loud it hears), or a crossed-out one when it can't listen right now.
 */
export function VoiceMic({ size = 30 }: { size?: number }) {
  const state = useVoiceState();
  const ref = useRef<HTMLSpanElement>(null);
  useMicLevel(ref);
  const off = state === 'unavailable' || state === 'denied' || state === 'error';
  return (
    <span ref={ref} className={'voice-mic ' + state} title={off ? 'No puede escuchar' : 'Escuchando'}>
      {off ? <MicOffIcon size={size} /> : <MicIcon size={size} />}
    </span>
  );
}

/** Playing by voice: the HUD badge (a tap tries to listen again after a problem). */
export function VoiceBadge() {
  return (
    <span className="hud-box hud-voice" onClick={retryVoice}>
      <VoiceMic size={26} />
    </span>
  );
}

/** The word (or name) the game just understood, written out in a speech bubble for a moment. */
export function VoiceHeard({ className }: { className?: string }) {
  const heard = useVoiceHeard();
  const [shown, setShown] = useState<{ text: string; n: number } | null>(null);
  const last = useRef(heard?.n ?? 0); // only words heard from now on (not one from an earlier game)
  useEffect(() => {
    if (!heard || heard.n <= last.current) return;
    last.current = heard.n;
    setShown(heard);
    const t = setTimeout(() => setShown(null), 1600);
    return () => clearTimeout(t);
  }, [heard]);
  if (!shown) return null;
  return (
    <div key={shown.n} className={'voice-heard' + (className ? ' ' + className : '')}>
      <MicIcon size={30} />
      {shown.text}
    </div>
  );
}

/** A gold star: this name was read out loud. */
export function StarIcon({ size = 24 }: { size?: number }) {
  return (
    <svg className="star" width={size} height={size} viewBox="0 0 16 16" aria-label="leído">
      <path
        d="M8 1 L10.1 5.5 L15 6 L11.3 9.3 L12.4 14.2 L8 11.7 L3.6 14.2 L4.7 9.3 L1 6 L5.9 5.5 Z"
        fill="#f8c838"
        stroke="#2a2238"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M6 6.6 L7.3 6.4" stroke="#fff6c8" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function EyeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="pix" aria-label="visto">
      <path d="M1 8 C4 3 12 3 15 8 C12 13 4 13 1 8 Z" fill="#ffffff" stroke="#2a2238" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="3" fill="#3a72e0" stroke="#2a2238" strokeWidth="1" />
      <circle cx="8" cy="8" r="1.3" fill="#1c1424" />
      <rect x="6.5" y="6" width="1.2" height="1.2" fill="#ffffff" />
    </svg>
  );
}

export function KeyHint({ children }: { children: ReactNode }) {
  return <div className="keyhint">{children}</div>;
}

/** ✓ for the A (yes / continue) button on touch screens. */
export function CheckMark({ size = '0.9em' }: { size?: number | string }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 16 16" aria-label="sí">
      <path d="M2.5 8.5 L6.5 12.5 L13.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** ✗ for the B (no / back) button on touch screens. */
export function CrossMark({ size = '0.9em' }: { size?: number | string }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 16 16" aria-label="no">
      <path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The key to press, as the player chose it ("Z", "Espacio"...). With a touch
 * screen the round ✓ / ✗ / ☰ / E / T / M buttons are shown instead (A / B on a gamepad).
 * `typing`: on the name screen letter keys write letters, so Intro / Retroceso act as A / B.
 */
export function KeyCap({ btn, typing = false }: { btn: Btn; typing?: boolean }) {
  const keys = useBindings();
  const source = useInputSource();
  if (source !== 'keyboard') {
    // Touch screens show ✓ / ✗ (letters mean nothing to small children); gamepads keep their A / B.
    if (btn === 'a') return source === 'touch' ? <span className="btn-a yes"><CheckMark /></span> : <span className="btn-a">A</span>;
    if (btn === 'b') return source === 'touch' ? <span className="btn-b no"><CrossMark /></span> : <span className="btn-b">B</span>;
    if (btn === 'menu') return <span className="btn-t btn-menu">☰</span>;
    if (btn === 'dex') return <span className="btn-t btn-dex">E</span>;
    if (btn === 'types') return <span className="btn-t">T</span>;
    if (btn === 'map') return <span className="btn-t">M</span>;
    return <span className="keycap">{{ up: '▲', down: '▼', left: '◀', right: '▶' }[btn]}</span>;
  }
  let key = keys[btn];
  if (typing && key.length === 1) key = btn === 'a' ? 'Enter' : btn === 'b' ? 'Backspace' : key;
  return <span className="keycap">{keyLabel(key)}</span>;
}

export const A = () => <KeyCap btn="a" />;
export const Bb = () => <KeyCap btn="b" />;
export const Qq = () => <KeyCap btn="menu" />;
export const Ee = () => <KeyCap btn="dex" />;
export const Tt = () => <KeyCap btn="types" />;
export const Mm = () => <KeyCap btn="map" />;

/** The two keys of an axis, e.g. "← →" or "↑ ↓". */
export function DirKeys({ pair }: { pair: 'lr' | 'ud' }) {
  return pair === 'lr' ? (
    <>
      <KeyCap btn="left" />
      <KeyCap btn="right" />
    </>
  ) : (
    <>
      <KeyCap btn="up" />
      <KeyCap btn="down" />
    </>
  );
}

export function HpBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const color = pct > 0.5 ? 'hp-high' : pct > 0.2 ? 'hp-mid' : 'hp-low';
  return (
    <div className="hpbar">
      <span className="hp-label">PS</span>
      <div className="hp-track">
        <div className={'hp-fill ' + color} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
