import { useState } from 'react';
import type { Settings } from '../game/save';
import { Menu, LAYER, KeyHint, A, Bb } from './ui';
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

export function SettingsPanel({ settings, onChange, onClose, layer = LAYER.dialog }: Props) {
  const [keysOpen, setKeysOpen] = useState(false);
  const [askReading, setAskReading] = useState(false);
  const [micOpen, setMicOpen] = useState(false);
  const [preparing, setPreparing] = useState<Promise<unknown> | undefined>();
  const [check] = useListenCheck(!micOpen); // checked again when the check panel closes
  const options = [
    { label: `Sonidos: ${yesNo(settings.sound)}` },
    { label: `Música: ${yesNo(settings.music)}` },
    {
      label: `Letra: ${settings.font === 'pixel' ? 'Píxel' : 'Fina'}`,
      sub: settings.font === 'pixel' ? 'Letra de videojuego antiguo' : 'Letra clara para aprender a leer',
    },
    { label: `Mayúsculas: ${yesNo(settings.upper)}`, sub: settings.upper ? 'TODO EN MAYÚSCULAS' : 'Mayúsculas y minúsculas' },
    { label: `Leer en voz alta: ${yesNo(settings.reading)}`, sub: 'Leer los nombres al micrófono' },
    { label: `Micrófono: ${check ? STATUS_TEXT[listenStatus(check)] : '…'}`, sub: 'Comprobar que puede escuchar' },
    { label: 'Teclas', sub: 'Elige qué tecla hace cada cosa' },
    { label: 'Pantalla completa' },
    { label: 'Volver' },
  ];
  return (
    <div className="dialog-backdrop">
      <div className="panel dialog settings">
        <p className="dialog-title">Ajustes</p>
        <Menu
          scroll
          options={options}
          layer={layer}
          active={!keysOpen && !askReading && !micOpen}
          onBack={onClose}
          onSelect={(i) => {
            if (i === 0) onChange({ ...settings, sound: !settings.sound });
            else if (i === 1) onChange({ ...settings, music: !settings.music });
            else if (i === 2) onChange({ ...settings, font: settings.font === 'pixel' ? 'fine' : 'pixel' });
            else if (i === 3) onChange({ ...settings, upper: !settings.upper });
            else if (i === 4) {
              if (settings.reading) onChange({ ...settings, reading: false });
              else setAskReading(true); // a grown-up decides about the microphone
            } else if (i === 5) {
              setPreparing(undefined);
              setMicOpen(true);
            } else if (i === 6) setKeysOpen(true);
            else if (i === 7) toggleFullscreen();
            else onClose();
          }}
        />
        <KeyHint>
          <A /> Cambiar &nbsp; <Bb /> Volver
        </KeyHint>
      </div>
      {askReading && (
        <ConfirmDialog
          text={
            canListen()
              ? 'Para adultos: el navegador escucha la voz para comprobar la lectura (a veces la envía a Google o Apple). ¿Activar el micrófono?'
              : 'Para adultos: este navegador no puede escuchar. Un adulto confirmará la lectura con ✓. ¿Activar?'
          }
          yes="Activar"
          layer={layer + 5}
          onAnswer={(yes) => {
            setAskReading(false);
            if (!yes) return;
            onChange({ ...settings, reading: true });
            if (!canListen()) return;
            setPreparing(prepareListening()); // asks for the microphone now, while the grown-up is here
            setMicOpen(true); // ...and shows whether everything is ready
          }}
        />
      )}
      {micOpen && <SpeechCheck layer={layer + 5} pending={preparing} onClose={() => setMicOpen(false)} />}
      {keysOpen && <KeyBindingsPanel keys={settings.keys} onChange={(keys) => onChange({ ...settings, keys })} onClose={() => setKeysOpen(false)} />}
    </div>
  );
}
