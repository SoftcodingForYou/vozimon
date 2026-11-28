import { getSpecies, type Species } from '../game/creatures';
import { effectiveness } from '../game/elements';
import { NO_FIGHTS, type FightRecords } from '../game/save';
import { portraitURL } from '../art/assets';
import { sfx } from '../system/audio';
import { CLOSE_WORDS, useVoice } from '../system/voice';
import { Menu, LAYER, TypeBadge, KeyHint, A, Bb, FitText, CupIcon, VoiceMic } from './ui';

interface Props {
  team: number[];
  wild: Species;
  exclude: number[];
  current?: number | null;
  title: string;
  allowCancel: boolean;
  record: FightRecords;
  onDone: (id: number | null) => void;
  voice?: boolean; // playing by voice: call a fighter by its name
}

/**
 * Grid of all caught Vozimón (name + picture) to choose a fighter, most used first (the order is
 * decided by the battle). The corner shows its wins / fights. Playing by voice, a fighter is called
 * by its name; «cancelar», «cerrar» or «volver» go back (when that's allowed).
 */
export function CreaturePicker({ team, wild, exclude, current, title, allowCancel, record, onDone, voice = false }: Props) {
  useVoice(
    {
      cmds: allowCancel
        ? [
            {
              words: CLOSE_WORDS,
              run: () => {
                sfx('back');
                onDone(null);
              },
            },
          ]
        : [],
      names: {
        ids: team,
        run: (id) => {
          if (exclude.includes(id)) return sfx('error'); // tired, or already fighting
          sfx('ok');
          onDone(id);
        },
      },
    },
    LAYER.picker,
    voice,
  );
  const hint = (s: Species) => {
    const m = effectiveness(s.types[0], wild.types);
    return m > 1 ? 'strong' : m < 1 ? 'weak' : '';
  };
  return (
    <div className="picker">
      <h2 className="picker-title">
        {voice && <VoiceMic size={36} />} {title}
      </h2>
      <Menu
        scroll
        options={team.map((id) => {
          const s = getSpecies(id);
          return {
            label: s.name,
            disabled: exclude.includes(id),
          };
        })}
        columns={4}
        layer={LAYER.picker}
        onSelect={(i) => onDone(team[i])}
        onBack={allowCancel ? () => onDone(null) : undefined}
        className="picker-grid"
        render={(o, i, sel) => {
          const s = getSpecies(team[i]);
          const h = hint(s);
          const r = record[s.id] ?? NO_FIGHTS;
          return (
            <div className={'pick-card' + (sel ? ' sel' : '') + (o.disabled ? ' tired' : '')}>
              <span className="pick-record" title={`${r.wins} victorias en ${r.fights} combates`}>
                <CupIcon />
                {r.wins}/{r.fights}
              </span>
              <img className="pix" src={portraitURL(s.id)} alt={s.name} draggable={false} />
              <FitText className="pick-name">{s.name}</FitText>
              <FitText className="pick-types">
                {s.types.map((t) => (
                  <TypeBadge key={t} type={t} small />
                ))}
              </FitText>
              {o.disabled ? (
                <span className="pick-tag tired">{team[i] === current ? 'Luchando' : 'Cansado'}</span>
              ) : h === 'strong' ? (
                <span className="pick-tag strong">¡Muy eficaz!</span>
              ) : null}
            </div>
          );
        }}
      />
      <KeyHint>
        <A /> Elegir {allowCancel && (<>&nbsp; <Bb /> Volver</>)}
      </KeyHint>
    </div>
  );
}
