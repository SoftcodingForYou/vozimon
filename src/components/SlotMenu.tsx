import { useState } from 'react';
import { EXPORT_EXT, OLD_EXPORT_EXTS, exportFileName, exportGame, parseExport, type ImportedGame, type SaveSlot } from '../game/save';
import { pickTextFile, saveTextFile, type FileKind } from '../system/files';
import { TOTAL } from '../game/creatures';
import { avatarURL } from '../art/assets';
import { MAP_NAMES } from '../world/tiles';
import { sfx } from '../system/audio';
import { Menu, LAYER, BallIcon, EyeIcon, KeyHint, A, Bb } from './ui';
import { ConfirmDialog } from './ConfirmDialog';

const GAME_FILE: FileKind = { description: 'Partida de Vozimón', ext: EXPORT_EXT, alsoOpens: OLD_EXPORT_EXTS };

interface Props {
  slots: SaveSlot[];
  onPlay: (id: string) => void;
  onNew: () => void;
  onImport: (g: ImportedGame) => void; // a game read from a file: next, the player names it
  onDelete: (id: string) => void;
  onSettings: () => void;
  onBack: () => void;
  active: boolean;
}

export function SlotMenu({ slots, onPlay, onNew, onImport, onDelete, onSettings, onBack, active }: Props) {
  const [chosen, setChosen] = useState<SaveSlot | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SaveSlot | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Load a game from a file (exported on this or another device); the file isn't needed afterwards.
  const importFile = () => {
    void pickTextFile(GAME_FILE).then((text) => {
      if (text === null) return;
      const game = parseExport(text);
      if (game) onImport(game);
      else {
        sfx('error');
        setMessage('Ese archivo no es una partida de Vozimón.');
      }
    });
  };

  // Save the chosen game to a file, e.g. to move it to another device.
  const exportFile = (slot: SaveSlot) => {
    void saveTextFile(exportFileName(slot), exportGame(slot), GAME_FILE).then((r) => {
      if (r === 'saved') setMessage(`La partida de ${slot.name} está guardada en un archivo.`);
    });
  };

  const options = [
    ...slots.map((s) => ({
      label: s.name,
      className: 'slot-opt',
    })),
    { label: '+ Nueva partida', className: 'new-opt' },
    { label: 'Cargar de un archivo', className: 'import-opt' },
    { label: 'Ajustes', className: 'settings-opt' },
  ];

  const select = (i: number) => {
    if (i < slots.length) {
      setChosen(slots[i]);
    } else if (i === slots.length) onNew();
    else if (i === slots.length + 1) importFile();
    else onSettings();
  };

  return (
    <div className="screen slot-screen">
      <h2 className="screen-title">¿Con qué partida jugamos?</h2>
      <div className="panel slot-panel">
        <Menu
          scroll
          options={options}
          onSelect={select}
          onBack={onBack}
          layer={LAYER.screen}
          active={active && !chosen && !confirmDelete && !message}
          className="slot-list"
          render={(o, i, sel) => {
            const s = slots[i];
            if (!s) {
              return (
                <>
                  <span className="cursor">{sel ? '▶' : ''}</span>
                  <span className="opt-label">{o.label}</span>
                </>
              );
            }
            return (
              <>
                <span className="cursor">{sel ? '▶' : ''}</span>
                <img className="pix slot-avatar" src={avatarURL(s.avatar)} alt="" draggable={false} />
                <span className="slot-info">
                  <span className="slot-name">{s.name}</span>
                  <span className="slot-stats">
                    <span className={'mode-badge ' + s.mode}>{s.mode === 'easy' ? 'Fácil' : 'Normal'}</span>
                    <span className="map-badge">{MAP_NAMES[s.map]}</span>
                    <BallIcon size={22} /> {s.caught.length}/{TOTAL}
                    <EyeIcon size={22} /> {s.seen.length}
                  </span>
                </span>
              </>
            );
          }}
        />
      </div>
      <KeyHint>
        <A /> Elegir &nbsp; <Bb /> Volver
      </KeyHint>

      {chosen && (
        <div className="dialog-backdrop">
          <div className="panel dialog">
            <p className="dialog-title">Partida de {chosen.name}</p>
            <Menu
              options={[{ label: '¡A jugar!' }, { label: 'Guardar en un archivo' }, { label: 'Borrar partida' }, { label: 'Volver' }]}
              layer={LAYER.dialog}
              active={!confirmDelete && !message}
              onSelect={(i) => {
                if (i === 0) onPlay(chosen.id);
                else if (i === 1) exportFile(chosen);
                else if (i === 2) {
                  setConfirmDelete(chosen);
                } else setChosen(null);
              }}
              onBack={() => setChosen(null)}
            />
          </div>
        </div>
      )}
      {message && (
        <div className="dialog-backdrop">
          <div className="panel dialog">
            <p className="dialog-title">{message}</p>
            <Menu options={[{ label: 'Vale' }]} layer={LAYER.dialog + 5} onSelect={() => setMessage(null)} onBack={() => setMessage(null)} />
          </div>
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog
          text={`¿Seguro que quieres borrar la partida de ${confirmDelete.name}? ¡No se puede deshacer!`}
          yes="Sí, borrar"
          no="No"
          onAnswer={(yes) => {
            if (yes) {
              sfx('back');
              onDelete(confirmDelete.id);
              setChosen(null);
            }
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}
