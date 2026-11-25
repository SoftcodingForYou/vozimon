import { getSpecies, type Species } from '../game/creatures';
import { effectiveness } from '../game/elements';
import { NO_FIGHTS, type FightRecords } from '../game/save';
import { portraitURL } from '../art/assets';
import { Menu, LAYER, TypeBadge, KeyHint, A, Bb, FitText, CupIcon } from './ui';

interface Props {
  team: number[];
  wild: Species;
  exclude: number[];
  current?: number | null;
  title: string;
  allowCancel: boolean;
  record: FightRecords;
  onDone: (id: number | null) => void;
}

/**
 * Grid of all caught Vozimón (name + picture) to choose a fighter, most used first (the order is
 * decided by the battle). The corner shows its wins / fights.
 */
export function CreaturePicker({ team, wild, exclude, current, title, allowCancel, record, onDone }: Props) {
  const hint = (s: Species) => {
    const m = effectiveness(s.types[0], wild.types);
    return m > 1 ? 'strong' : m < 1 ? 'weak' : '';
  };
  return (
    <div className="picker">
      <h2 className="picker-title">{title}</h2>
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
