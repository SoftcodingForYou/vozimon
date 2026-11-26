import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { askMicrophone, checkListening, installVoicePack, listenStatus, probeListening, type ListenCheck, type ListenStatus } from '../system/listen';
import { sfx } from '../system/audio';
import { Menu, LAYER, KeyHint, A, Bb, MicIcon, MicOffIcon } from './ui';

/**
 * Whether reading aloud will work on this device. It is checked again when the window gets the focus
 * back (e.g. after a grown-up allowed the microphone in the browser's settings) and when the
 * microphone permission changes.
 */
export function useListenCheck(enabled = true): [ListenCheck | null, () => void] {
  const [check, setCheck] = useState<ListenCheck | null>(null);
  const live = useRef(true);
  const refresh = useCallback(() => {
    void checkListening().then((c) => live.current && setCheck(c));
  }, []);
  useEffect(() => {
    live.current = true;
    if (!enabled) return;
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    let perm: PermissionStatus | null = null;
    navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((p) => {
        perm = p;
        p.addEventListener('change', refresh);
      })
      .catch(() => {});
    return () => {
      live.current = false;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
      perm?.removeEventListener('change', refresh);
    };
  }, [enabled, refresh]);
  return [check, refresh];
}

export const STATUS_TEXT: Record<ListenStatus, string> = {
  ok: 'Listo',
  setup: 'Falta configurar',
  none: 'No disponible aquí',
};

/** Why listening failed last time, for the grown-up. */
function errorText(err: string): string {
  if (err === 'network')
    return 'El navegador no llegó a su servicio de voz. Descarga la voz en español, revisa internet o usa Chrome, Edge o Safari.';
  if (err === 'not-allowed') return 'El micrófono no tenía permiso.';
  if (err === 'service-not-allowed') return 'El navegador no deja usar su servicio de voz.';
  if (err === 'audio-capture') return 'El micrófono no funcionó.';
  if (err === 'language-not-supported' || err === 'language-not-available') return 'El navegador no entiende español.';
  return `El navegador dio un error (${err}).`;
}

type Mark = 'ok' | 'warn' | 'bad';
interface Row {
  mark: Mark;
  text: string;
}

function rows(c: ListenCheck): Row[] {
  if (!c.browser)
    return [
      {
        mark: 'bad',
        text: 'Este navegador no puede escuchar. Usa Chrome, Edge o Safari.',
      },
    ];
  if (!c.secure)
    return [
      {
        mark: 'bad',
        text: 'Sin https el navegador no deja usar el micrófono.',
      },
    ];
  const out: Row[] = [{ mark: 'ok', text: 'El navegador puede escuchar.' }];
  out.push(
    c.mic === 'granted'
      ? { mark: 'ok', text: 'Micrófono permitido.' }
      : c.mic === 'prompt'
        ? { mark: 'warn', text: 'Falta dar permiso al micrófono.' }
        : c.mic === 'denied'
          ? {
              mark: 'bad',
              text: 'Micrófono bloqueado: permítelo en el candado junto a la dirección de la página.',
            }
          : c.mic === 'none'
            ? { mark: 'bad', text: 'No se encontró ningún micrófono.' }
            : { mark: 'warn', text: 'No se sabe si hay permiso: pruébalo.' },
  );
  out.push(
    c.pack === 'local'
      ? { mark: 'ok', text: 'Voz en español instalada en este aparato.' }
      : c.pack === 'downloadable'
        ? { mark: 'warn', text: 'Falta descargar la voz en español.' }
        : c.pack === 'downloading'
          ? { mark: 'warn', text: 'Descargando la voz en español…' }
          : c.online
            ? {
                mark: 'ok',
                text: 'Usa el servicio de voz del navegador (con internet).',
              }
            : {
                mark: 'bad',
                text: 'Sin internet y sin voz en español instalada.',
              },
  );
  if (c.lastError)
    out.push({
      mark: 'bad',
      text: 'La última vez no funcionó. ' + errorText(c.lastError),
    });
  return out;
}

const MARK: Record<Mark, ReactNode> = { ok: '✓', warn: '!', bad: '✗' };

type Probe = { k: 'idle' } | { k: 'listening' } | { k: 'done'; heard: string; error: string | null };

interface Props {
  onClose: () => void;
  closeLabel?: string; // e.g. "Jugar" when it was shown on the way into the game
  layer?: number;
  pending?: Promise<unknown>; // something just asked for (microphone, voice pack): check again when it's done
}

/** For grown-ups: is everything set up for reading names out loud? What's missing, and fix it. */
export function SpeechCheck({ onClose, closeLabel = 'Volver', layer = LAYER.dialog + 5, pending }: Props) {
  const [check, refresh] = useListenCheck();
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<Probe>({ k: 'idle' });
  const stopProbe = useRef<() => void>(() => {});

  useEffect(() => {
    if (pending) void pending.then(refresh);
  }, [pending, refresh]);
  useEffect(() => () => stopProbe.current(), []);

  const run = (p: Promise<unknown>) => {
    setBusy(true);
    void p.finally(() => {
      setBusy(false);
      refresh();
    });
  };

  const test = () => {
    setProbe({ k: 'listening' });
    const p = probeListening();
    stopProbe.current = p.stop;
    void p.result.then((r) => {
      if (r.error === 'aborted') return;
      sfx(r.heard ? 'ok' : 'error');
      setProbe({ k: 'done', ...r });
      refresh();
    });
  };

  const actions: { label: string; act: () => void }[] = [];
  if (check?.browser && check.secure) {
    if (check.mic === 'prompt' || check.mic === 'unknown')
      actions.push({
        label: 'Dar permiso al micrófono',
        act: () => run(askMicrophone()),
      });
    if (check.pack === 'downloadable')
      actions.push({
        label: 'Descargar voz en español',
        act: () => run(installVoicePack()),
      });
    if (check.mic !== 'denied' && check.mic !== 'none') actions.push({ label: 'Probar: di algo', act: test });
  }
  actions.push({ label: closeLabel, act: onClose });

  const status = check ? listenStatus(check) : null;
  return (
    <div className="dialog-backdrop">
      <div className="panel dialog speech-check">
        <p className="dialog-title">
          {status === 'none' ? <MicOffIcon size={30} /> : <MicIcon size={30} />} Micrófono: {status ? STATUS_TEXT[status] : '…'}
        </p>
        <p className="speech-sub">Para adultos: así se comprueba la lectura en voz alta.</p>
        <ul className="speech-rows">
          {check &&
            rows(check).map((r, i) => (
              <li key={i} className={r.mark}>
                <span className="speech-mark">{MARK[r.mark]}</span>
                {r.text}
              </li>
            ))}
          {probe.k === 'listening' && (
            <li className="warn">
              <span className="speech-mark">…</span>Escuchando: di algo.
            </li>
          )}
          {probe.k === 'done' && (
            <li className={probe.heard ? 'ok' : 'bad'}>
              <span className="speech-mark">{probe.heard ? '✓' : '✗'}</span>
              {probe.heard
                ? `Oído: «${probe.heard}»`
                : probe.error === 'no-speech'
                  ? 'No se oyó nada. ¿Está el micrófono encendido?'
                  : errorText(probe.error ?? '')}
            </li>
          )}
        </ul>
        <Menu
          oneLine
          options={actions.map((a) => ({ label: a.label }))}
          layer={layer}
          active={!busy && probe.k !== 'listening'}
          initial={0}
          onSelect={(i) => actions[i]?.act()}
          onBack={onClose}
        />
        <KeyHint>
          <A /> Elegir &nbsp; <Bb /> {closeLabel}
        </KeyHint>
      </div>
    </div>
  );
}
