import { describe, expect, it } from 'vitest';
import { SPECIES } from '../game/creatures';
import { heardName, soundKey, syllables } from '../game/reading';

const id = (name: string) => SPECIES.find((s) => s.name === name)!.id;

describe('reading names out loud', () => {
  it('hears every name however the recogniser writes it', () => {
    for (const s of SPECIES) {
      const plain = s.name.normalize('NFD').replace(/[̀-ͯ]/g, '');
      expect(heardName([s.name], s.id), s.name).toBe(true);
      expect(heardName([plain.toLowerCase()], s.id), plain).toBe(true);
      expect(heardName([s.name.toUpperCase()], s.id), s.name).toBe(true);
      expect(heardName([`se llama ${s.name.toLowerCase()}`], s.id), s.name).toBe(true);
    }
  });

  it('forgives typical slips of children and recognisers', () => {
    expect(heardName(['chispin'], id('Chispín'))).toBe(true);
    expect(heardName(['lobo can'], id('Lobolcán'))).toBe(true);
    expect(heardName(['bolcarex'], id('Volcarex'))).toBe(true);
    expect(heardName(['ranitas'], id('Ranita'))).toBe(true);
    expect(heardName(['el gato', 'mareon'], id('Mareón'))).toBe(true); // any of the guesses
    expect(heardName(['pinguin'], id('Pingüín'))).toBe(true);
    // read syllable by syllable, finished as a real word, vowels mixed up
    expect(heardName(['tri nin'], id('Trinín'))).toBe(true);
    expect(heardName(['Trinidad'], id('Trinín'))).toBe(true);
    expect(heardName(['trenin'], id('Trinín'))).toBe(true);
    expect(heardName(['trine'], id('Trinín'))).toBe(true);
    expect(heardName(['Trinero'], id('Trinín'))).toBe(false); // that's its evolution
  });

  it('does not count other words or another Vozimón', () => {
    expect(heardName(['gato'], id('Chispín'))).toBe(false);
    expect(heardName([''], id('Chispín'))).toBe(false);
    expect(heardName([], id('Chispín'))).toBe(false);
    expect(heardName(['no sé'], id('Gotín'))).toBe(false);
    expect(heardName(['Lanita'], id('Ranita'))).toBe(false);
    for (const a of SPECIES) for (const b of SPECIES) if (a.id !== b.id) expect(heardName([a.name], b.id), `${a.name} → ${b.name}`).toBe(false);
  });

  it('folds letters that sound the same', () => {
    expect(soundKey('Volcarex')).toBe(soundKey('bolkareks'));
    expect(soundKey('Cerdín')).toBe(soundKey('serdin'));
    expect(soundKey('Ardillín')).toBe(soundKey('ardiyin'));
    expect(soundKey('Hormiguín')).toBe(soundKey('ormiguin'));
    expect(soundKey('Hormiguín')).not.toBe(soundKey('ormijin')); // gui ≠ ji
    expect(soundKey('Chilín')).not.toBe(soundKey('Silín'));
  });

  it('splits names into syllables', () => {
    const cases: Record<string, string> = {
      Chispín: 'Chis-pín',
      Lobolcán: 'Lo-bol-cán',
      Ramiciervo: 'Ra-mi-cier-vo',
      Mareón: 'Ma-re-ón',
      Buhíto: 'Bu-hí-to',
      Pingüín: 'Pin-güín',
      Emperingüín: 'Em-pe-rin-güín',
      Cangrejín: 'Can-gre-jín',
      Astromar: 'As-tro-mar',
      Hormiguín: 'Hor-mi-guín',
      Iguanita: 'I-gua-ni-ta',
      Aurorón: 'Au-ro-rón',
      Chivarrón: 'Chi-va-rrón',
      Ardillín: 'Ar-di-llín',
      Koalín: 'Ko-a-lín',
      Zanahorión: 'Za-na-ho-rión',
      Puñín: 'Pu-ñín',
      Estrellín: 'Es-tre-llín',
      Yetín: 'Ye-tín',
    };
    for (const [name, want] of Object.entries(cases)) expect(syllables(name).join('-'), name).toBe(want);
    for (const s of SPECIES) {
      const parts = syllables(s.name);
      expect(parts.join(''), s.name).toBe(s.name);
      expect(parts.every((p) => /[aeiouáéíóúü]/i.test(p)), `${s.name}: ${parts.join('-')}`).toBe(true);
    }
  });
});
