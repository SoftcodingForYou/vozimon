import { useState } from 'react';
import type { Settings } from '../game/save';
import { Menu, LAYER, KeyHint, A, Bb, type Opt } from './ui';
import { KeyBindingsPanel } from './KeyBindingsPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { canListen, listenStatus, prepareListening } from '../system/listen';
import { SpeechCheck, STATUS_TEXT, useListenCheck } from './SpeechCheck';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
  layer?: number;
}

const yesNo = (on: boolean) => (on ? 'Sí' : 'No');

function toggleFullscreen() {
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (document.fullscreenElement || doc.webkitFullscreenElement) {
    (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()) as unknown;
  } else {
    (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.()) as unknown;
  }
}

/**
 * Ajustes: what grown-ups set most (microphone, reading aloud, playing by voice, music, sounds) and,
 * one level down, "Avanzado" (letters, capitals, keys, full screen).
 */
export function SettingsPanel({ settings, onChange, onClose, layer = LAYER.dialog }: Props) {
  const [page, setPage] = useState<'main' | 'advanced'>('main');
  const [mainStart, setMainStart] = useState(0); // back from Avanzado: that option stays chosen
  const [keysOpen, setKeysOpen] = useState(false);
  const [ask, setAsk] = useState<'reading' | 'voice' | null>(null); // a grown-up decides about the microphone
  const [micOpen, setMicOpen] = useState(false);
  const [preparing, setPreparing] = useState<Promise<unknown> | undefined>();
  const [check] = useListenCheck(!micOpen); // checked again when the check panel closes
  const status = check ? listenStatus(check) : null;
  const micMissing = (settings.reading || settings.voice) && status !== null && status !== 'ok';

  const main: Opt[] = [
    { label: `Micrófono: ${status ? STATUS_TEXT[status] : '…'}`, sub: 'Comprobar que puede escuchar', className: micMissing ? 'mic-need' : undefined },
    { label: `Leer en voz alta: ${yesNo(settings.reading)}`, sub: 'Leer los nombres al micrófono' },
    { label: `Jugar con la voz: ${yesNo(settings.voice)}`, sub: 'Decir «atacar», «mapa» o un nombre' },
    { label: `Música: ${yesNo(settings.music)}` },
    { label: `Sonidos: ${yesNo(settings.sound)}` },
    { label: 'Avanzado' }, // letters, capitals, keys, full screen
    { label: 'Volver' },
  ];
  const advanced: Opt[] = [
    {
      label: `Letra: ${settings.font === 'pixel' ? 'Píxel' : 'Fina'}`,
      sub: settings.font === 'pixel' ? 'Letra de videojuego antiguo' : 'Letra clara para aprender a leer',
    },
    { label: `Mayúsculas: ${yesNo(settings.upper)}`, sub: settings.upper ? 'TODO EN MAYÚSCULAS' : 'Mayúsculas y minúsculas' },
    { label: 'Teclas', sub: 'Elige qué tecla hace cada cosa' },
    { label: 'Pantalla completa' },
    { label: 'Volver' },
  ];

  const openCheck = (pending?: Promise<unknown>) => {
    setPreparing(pending);
    setMicOpen(true);
  };
  const backToMain = () => {
    setMainStart(5);
    setPage('main');
  };

  const selectMain = (i: number) => {
    if (i === 0) openCheck();
    else if (i === 1) {
      if (settings.reading) onChange({ ...settings, reading: false });
      else setAsk('reading');
    } else if (i === 2) {
      if (settings.voice) onChange({ ...settings, voice: false });
      else setAsk('voice');
    } else if (i === 3) onChange({ ...settings, music: !settings.music });
    else if (i === 4) onChange({ ...settings, sound: !settings.sound });
    else if (i === 5) setPage('advanced');
    else onClose();
  };
  const selectAdvanced = (i: number) => {
    if (i === 0) onChange({ ...settings, font: settings.font === 'pixel' ? 'fine' : 'pixel' });
    else if (i === 1) onChange({ ...settings, upper: !settings.upper });
    else if (i === 2) setKeysOpen(true);
    else if (i === 3) toggleFullscreen();
    else backToMain();
  };

  const askText =
    ask === 'reading'
      ? canListen()
        ? 'Para adultos: el navegador escucha la voz para comprobar la lectura (a veces la envía a Google o Apple). ¿Activar el micrófono?'
        : 'Para adultos: este navegador no puede escuchar. Un adulto confirmará la lectura con ✓. ¿Activar?'
      : canListen()
        ? 'Para adultos: el micrófono escucha todo el rato mientras se juega, para entender «atacar», «mapa» o el nombre de un Vozimón (sin la voz en español instalada, el navegador la envía a Google o Apple). ¿Activar?'
        : 'Para adultos: este navegador no puede escuchar, pero los botones seguirán funcionando como siempre. ¿Activar?';

  return (
    <div className="dialog-backdrop">
      <div className="panel dialog settings">
        <p className="dialog-title">{page === 'main' ? 'Ajustes' : 'Avanzado'}</p>
        <Menu
          key={page}
          scroll
          options={page === 'main' ? main : advanced}
          initial={page === 'main' ? mainStart : 0}
          layer={layer}
          active={!keysOpen && !ask && !micOpen}
          onBack={page === 'main' ? onClose : backToMain}
          onSelect={page === 'main' ? selectMain : selectAdvanced}
        />
        <KeyHint>
          <A /> Cambiar &nbsp; <Bb /> Volver
        </KeyHint>
      </div>
      {ask && (
        <ConfirmDialog
          text={askText}
          yes="Activar"
          layer={layer + 5}
          onAnswer={(yes) => {
            const what = ask;
            setAsk(null);
            if (!yes) return;
            onChange(what === 'reading' ? { ...settings, reading: true } : { ...settings, voice: true });
            if (!canListen()) return;
            // asks for the microphone now, while the grown-up is here, and shows whether everything is ready
            openCheck(prepareListening());
          }}
        />
      )}
      {micOpen && <SpeechCheck layer={layer + 5} pending={preparing} onClose={() => setMicOpen(false)} />}
      {keysOpen && <KeyBindingsPanel keys={settings.keys} onChange={(keys) => onChange({ ...settings, keys })} onClose={() => setKeysOpen(false)} />}
    </div>
  );
}
