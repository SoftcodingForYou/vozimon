// The 151 original Vozimon. Families are listed in Vozidex order;
// numbers (1..151) are assigned automatically in that order.

import type { Elem } from './elements';
import type { ArtSpec } from '../art/creatureArt';

export type Habitat = 'pradera' | 'bosque' | 'lago' | 'playa' | 'montana' | 'cumbre' | 'volcan';

export const HABITAT_NAMES: Record<Habitat, string> = {
  pradera: 'la pradera',
  bosque: 'el bosque',
  lago: 'el lago y el río',
  playa: 'la playa',
  montana: 'la montaña',
  cumbre: 'la cumbre nevada',
  volcan: 'el volcán',
};

/** Generic overworld look (the real portrait stays secret until met). */
export type OwKind = 'land' | 'bird' | 'water' | 'bug' | 'ghost' | 'plant';

export interface Species {
  id: number;
  name: string;
  types: Elem[];
  attack: string;
  habitats: Habitat[];
  desc: string;
  stage: number; // 1-based position in its evolution family
  family: number; // number of members in its family
  pow: number; // strength 1..10 (drives HP and damage)
  rarity: number; // spawn weight (0 = special spawn only)
  art: ArtSpec;
  ow: OwKind;
  legendary: boolean;
  mythical: boolean;
}

interface MemberDef {
  n: string; // name
  a: string; // attack
  d: string; // description
  t?: Elem[];
  h?: Habitat[];
  art?: Partial<ArtSpec>;
  f?: string[]; // features added from this stage on
  drop?: string[]; // features removed from this stage on
}

interface FamDef {
  t: Elem[];
  h: Habitat[];
  art: ArtSpec;
  m: MemberDef[];
  starter?: boolean;
  legendary?: boolean;
  mythical?: boolean;
}

const FAMILIES: FamDef[] = [
  // 001-003 · Fuego (inicial)
  {
    t: ['fuego'],
    h: ['volcan'],
    starter: true,
    art: { k: 'quad', v: 'dog', c: ['#f07a3a', '#ffe2a6', '#c8401c', '#fff0b0'], f: ['e-pointy', 't-flame', 'blush'] },
    m: [
      { n: 'Chispín', a: 'Bola de fuego', d: 'Un perrito juguetón. La llamita de su cola nunca se apaga.' },
      { n: 'Brasón', a: 'Llamarada', d: 'Cuando está contento, su cola echa chispas de colores.', f: ['h-tuft'], art: { e: 'shine' } },
      {
        n: 'Lobolcán',
        a: 'Erupción',
        d: 'Un lobo valiente. Su melena de fuego brilla en la noche.',
        f: ['mane', 'mane-fire'],
        drop: ['blush', 'h-tuft'],
        art: { v: 'wolf', e: 'angry' },
      },
    ],
  },
  // 004-006 · Agua (inicial)
  {
    t: ['agua'],
    h: ['lago'],
    starter: true,
    art: { k: 'quad', v: 'axolotl', c: ['#7cc6f6', '#e6f6ff', '#f77ea8'], f: ['e-gills', 't-fin', 'blush'] },
    m: [
      { n: 'Gotín', a: 'Lluvia de burbujas', d: 'Le encanta chapotear en los charcos. ¡Siempre sonríe!' },
      { n: 'Ajolín', a: 'Chorro de agua', d: 'Puede respirar dentro y fuera del agua.', f: ['spots'] },
      {
        n: 'Marajol',
        a: 'Ola gigante',
        d: 'Con un golpe de cola hace olas enormes en el lago.',
        h: ['lago', 'playa'],
        f: ['spikes'],
        art: { e: 'angry', p: { len: 27, h: 13, leg: 9 } },
      },
    ],
  },
  // 007-009 · Planta (inicial)
  {
    t: ['planta'],
    h: ['pradera'],
    starter: true,
    art: { k: 'quad', v: 'deer', c: ['#86c862', '#f6f2c4', '#fbf8dc'], f: ['e-pointy', 'h-sprout', 't-short', 'spots', 'ei-p'] },
    m: [
      { n: 'Brotín', a: 'Hoja cortante', d: 'Un cervatillo con un brote en la cabeza. Le encanta tomar el sol.' },
      {
        n: 'Ramiciervo',
        a: 'Látigo de ramas',
        d: 'Sus cuernos son ramas que florecen en primavera.',
        h: ['bosque'],
        f: ['h-antlers', 'leaves'],
        drop: ['h-sprout'],
      },
      {
        n: 'Bosquiervo',
        a: 'Tormenta de flores',
        d: 'El guardián de los prados. Donde pisa, crecen flores.',
        h: ['bosque'],
        f: ['flowers'],
        art: { e: 'shine' },
      },
    ],
  },
  // 010-012 · Oruga
  {
    t: ['bicho'],
    h: ['pradera', 'bosque'],
    art: { k: 'bug', v: 'caterpillar', c: ['#9ad64a', '#f2f8b4', '#f2742e', '#f2742e'], f: ['h-antenna', 'blush'] },
    m: [
      { n: 'Gusanín', a: 'Mordisquito', d: 'Come hojas todo el día. ¡Siempre tiene hambre!' },
      {
        n: 'Crisalín',
        a: 'Coraza',
        d: 'Duerme dentro de su capullo. Pronto será algo precioso.',
        art: { k: 'blob', v: 'cocoon', c: ['#c9c08a', '#f0ecc8', '#8a8050'], e: 'sleepy' },
      },
      {
        n: 'Mariposol',
        a: 'Polvo brillante',
        d: 'Sus alas brillan como el sol. Vuela de flor en flor.',
        t: ['bicho', 'aire'],
        art: { k: 'winged', v: 'butterfly', c: ['#f8c838', '#fff4c0', '#f07020', '#4a3428'], e: 'dot' },
      },
    ],
  },
  // 013-015 · Pájaro
  {
    t: ['normal', 'aire'],
    h: ['pradera'],
    art: { k: 'bird', v: 'perch', c: ['#b07a4c', '#f8e2b4', '#7a4a2c', '#e8583a'], f: ['blush'] },
    m: [
      { n: 'Trinín', a: 'Pico rápido', d: 'Canta por las mañanas para despertar a todos.' },
      { n: 'Trinero', a: 'Aleteo', d: 'Vuela muy rápido entre los árboles.', f: ['h-crest'] },
      {
        n: 'Huracanero',
        a: 'Huracán',
        d: 'Sus alas son tan fuertes que levantan remolinos de viento.',
        h: ['montana'],
        drop: ['blush'],
        art: { v: 'fly', e: 'angry' },
      },
    ],
  },
  // 016-017 · Hámster
  {
    t: ['normal'],
    h: ['pradera'],
    art: { k: 'quad', v: 'rodent', c: ['#f2b874', '#fff4e2', '#f6a0a0'], f: ['e-round', 'blush', 't-short', 'ei-p'] },
    m: [
      { n: 'Hamstín', a: 'Ataque moflete', d: 'Guarda semillas en sus mofletes para la merienda.' },
      { n: 'Hamstrón', a: 'Panzazo', d: 'Es tan redondito que rueda colina abajo.', f: ['h-tuft'], art: { k: 'biped', v: 'hamster' } },
    ],
  },
  // 018-019 · Conejo eléctrico
  {
    t: ['electrico'],
    h: ['pradera', 'montana'],
    art: { k: 'quad', v: 'rodent', c: ['#f6dc4c', '#fffbe0', '#3a3248', '#ff9a2a'], f: ['e-long', 'tips', 't-bolt', 'bolt'], p: { leg: 9 } },
    m: [
      { n: 'Voltín', a: 'Chispita', d: 'Sus orejas largas avisan cuando viene una tormenta.' },
      { n: 'Voltarón', a: 'Rayo veloz', d: 'Salta tan alto que toca las nubes.', art: { k: 'biped', v: 'bunny', e: 'shine' } },
    ],
  },
  // 020-021 · Serpiente liana
  {
    t: ['planta'],
    h: ['bosque'],
    art: { k: 'serpent', c: ['#58b04a', '#dcf2a4', '#f27a9a'], f: ['h-leaf', 'blush'], m: 'tongue' },
    m: [
      { n: 'Lianín', a: 'Enredadera', d: 'Se esconde entre las plantas del bosque.' },
      {
        n: 'Lianaconda',
        a: 'Abrazo de lianas',
        d: 'Es larguísima. Se enrolla en los árboles para dormir.',
        f: ['h-flower'],
        art: { p: { thick: 9.5, head: 13 } },
      },
    ],
  },
  // 022-023 · Hormiga
  {
    t: ['bicho'],
    h: ['pradera'],
    art: { k: 'bug', v: 'ant', c: ['#d4532f', '#f8c4a4', '#4a2820', '#f8d838'], f: ['h-antenna'] },
    m: [
      { n: 'Hormiguín', a: 'Pellizco', d: 'Puede cargar hojas diez veces más grandes que él.' },
      {
        n: 'Hormigón',
        a: 'Mandíbula de piedra',
        d: 'Su cuerpo es duro como una piedra. ¡Construye túneles enormes!',
        t: ['bicho', 'roca'],
        h: ['pradera', 'montana'],
        f: ['bands', 'h-horns'],
        art: { c: ['#9a6a52', '#e2c4a8', '#3e2a22', '#d8d8e8'], e: 'angry' },
      },
    ],
  },
  // 024-025 · Topo
  {
    t: ['roca'],
    h: ['pradera', 'montana'],
    art: { k: 'biped', v: 'mole', c: ['#8c6c52', '#f0d2b2', '#f6a2aa'], f: ['claws', 'nose', 'e-tiny'], e: 'sleepy' },
    m: [
      { n: 'Topín', a: 'Excavar', d: 'Vive bajo tierra. El sol le da un poquito de sueño.' },
      {
        n: 'Topazo',
        a: 'Temblor',
        d: 'Cuando golpea el suelo con sus garras, ¡todo tiembla!',
        f: ['h-gem'],
        art: { e: 'angry', p: { bw: 19, bh: 18, armW: 5 } },
      },
    ],
  },
  // 026-027 · Hada
  {
    t: ['magia'],
    h: ['pradera', 'bosque'],
    art: { k: 'winged', v: 'fairy', c: ['#f6b8d8', '#fff0f8', '#b694f6', '#f8d848'], f: ['h-antenna1', 'blush'], e: 'shine' },
    m: [
      { n: 'Hadín', a: 'Polvo de estrellas', d: 'Un hada chiquitita que reparte sueños bonitos.' },
      { n: 'Hadalina', a: 'Destello mágico', d: 'Con un giro hace aparecer arcoíris.', f: ['arms', 'h-crown'], drop: ['h-antenna1'] },
    ],
  },
  // 028-029 · Gatito
  {
    t: ['normal'],
    h: ['pradera'],
    art: { k: 'quad', v: 'cat', c: ['#f6eee0', '#ffffff', '#f4a050'], f: ['e-pointy', 't-thin', 'whiskers', 'spots', 'ei-p'], m: 'cat' },
    m: [
      { n: 'Michín', a: 'Zarpita', d: 'Un gatito curioso. Le encanta perseguir mariposas.' },
      {
        n: 'Michón',
        a: 'Zarpazo',
        d: 'Camina sin hacer ruido. ¡Es un gran saltador!',
        art: { c: ['#f4a050', '#fff2e0', '#c86a28'], e: 'shine', p: { len: 25, leg: 14 } },
      },
    ],
  },
  // 030-032 · Piedra
  {
    t: ['roca'],
    h: ['montana'],
    art: { k: 'rock', v: 'pebble', c: ['#a8a090', '#d6cebe', '#786e5e', '#7ad0e8'] },
    m: [
      { n: 'Piedrín', a: 'Placaje de roca', d: 'Parece una piedra normal... ¡hasta que abre los ojos!' },
      { n: 'Pedrusco', a: 'Lanzarrocas', d: 'Rueda por las montañas a toda velocidad.', art: { v: 'boulder', e: 'angry' } },
      {
        n: 'Rocazón',
        a: 'Puño de montaña',
        d: 'Fuerte como una montaña. Protege a los más pequeños.',
        t: ['roca', 'lucha'],
        f: ['crystals'],
        art: { v: 'golem' },
      },
    ],
  },
  // 033-034 · Luciérnaga
  {
    t: ['fuego', 'bicho'],
    h: ['bosque', 'pradera'],
    art: { k: 'bug', v: 'firefly', c: ['#5a4a7a', '#d8e8ff', '#3a2e52', '#ffd040'], f: ['h-antenna'] },
    m: [
      { n: 'Lucerín', a: 'Lucecita', d: 'Su colita brilla en la oscuridad como una estrella.' },
      { n: 'Lucernón', a: 'Destello ardiente', d: 'Ilumina el bosque por la noche para que nadie se pierda.', art: { e: 'shine' } },
    ],
  },
  // 035-036 · Rana
  {
    t: ['agua'],
    h: ['lago'],
    art: { k: 'blob', v: 'frog', c: ['#62c862', '#f2f8c2', '#e84a3a'], f: ['blush'] },
    m: [
      { n: 'Ranita', a: 'Salpicón', d: 'Croa muy fuerte cuando llueve. ¡Croac, croac!' },
      {
        n: 'Ranazo',
        a: 'Patada de rana',
        d: 'Entrena saltando de nenúfar en nenúfar.',
        t: ['agua', 'lucha'],
        f: ['h-band', 'fists'],
        drop: ['blush'],
        art: { k: 'biped', v: 'frog', e: 'angry' },
      },
    ],
  },
  // 037-038 · Patito
  {
    t: ['agua', 'aire'],
    h: ['lago'],
    art: { k: 'bird', v: 'duck', c: ['#f8e062', '#fff8ca', '#f2c43a'], f: ['blush'] },
    m: [
      { n: 'Patín', a: 'Remolino', d: 'Nada en círculos y hace remolinos en el agua.' },
      {
        n: 'Patazo',
        a: 'Ala acuática',
        d: 'Un pato elegante que vuela sobre el lago.',
        f: ['h-crest'],
        drop: ['blush'],
        art: { c: ['#f6f6f8', '#ffffff', '#7ab4e8', '#5a9ad8'] },
      },
    ],
  },
  // 039-040 · Seta
  {
    t: ['planta'],
    h: ['bosque'],
    art: { k: 'plant', v: 'mushroom', c: ['#e85252', '#f8ead2', '#ffffff'], f: ['blush'] },
    m: [
      { n: 'Setín', a: 'Esporas', d: 'Si estornuda, suelta polvitos que dan sueño.' },
      {
        n: 'Setazo',
        a: 'Nube de esporas',
        d: 'Vive en la parte más oscura del bosque.',
        t: ['planta', 'fantasma'],
        f: ['arms'],
        drop: ['blush'],
        art: { c: ['#9a5ac2', '#ecdcf2', '#f8e070'], e: 'glow' },
      },
    ],
  },
  // 041-042 · Murciélago
  {
    t: ['aire', 'fantasma'],
    h: ['bosque', 'montana'],
    art: { k: 'winged', v: 'bat', c: ['#7a5aaa', '#c8b2e8', '#4e3878'], f: ['e-bat', 'fangs'] },
    m: [
      { n: 'Murcielín', a: 'Chillido', d: 'Duerme boca abajo durante el día.' },
      { n: 'Murcielón', a: 'Ala sombría', d: 'Vuela de noche sin chocar con nada.', art: { e: 'angry' } },
    ],
  },
  // 043-044 · Lava
  {
    t: ['fuego'],
    h: ['volcan'],
    art: { k: 'blob', v: 'lava', c: ['#f05a2a', '#f8b44a', '#5a3a3a'] },
    m: [
      { n: 'Lavita', a: 'Lava pegajosa', d: 'Una gotita de lava. ¡No la abraces, que quema!' },
      {
        n: 'Lavarón',
        a: 'Volcán andante',
        d: 'Duerme dentro del volcán, en la lava calentita.',
        t: ['fuego', 'roca'],
        f: ['crystals', 'h-flame'],
        art: { e: 'angry' },
      },
    ],
  },
  // 045-046 · Pez
  {
    t: ['agua'],
    h: ['lago'],
    art: { k: 'fish', c: ['#f89a3a', '#fff0c2', '#f8f8f8'], f: ['stripes'] },
    m: [
      { n: 'Aletín', a: 'Coletazo', d: 'Nada muy rápido. Sus aletas parecen velas.' },
      { n: 'Aletón', a: 'Torbellino', d: 'Salta fuera del agua para ver el mundo.', f: ['h-crest'], art: { c: ['#e8584a', '#ffe0c8', '#f8d448'] } },
    ],
  },
  // 047-048 · Cangrejo
  {
    t: ['agua', 'roca'],
    h: ['playa'],
    art: { k: 'shell', v: 'crab', c: ['#e8583e', '#f8c2a2', '#a83020'], f: ['blush'] },
    m: [
      { n: 'Cangrejín', a: 'Pinza', d: 'Camina de lado por la playa. ¡Clic, clac!' },
      { n: 'Cangrejón', a: 'Gran pinza', d: 'Sus pinzas son tan fuertes que abren cocos.', f: ['spikes'], art: { e: 'angry' } },
    ],
  },
  // 049-050 · Pulpo
  {
    t: ['agua'],
    h: ['playa'],
    art: { k: 'jelly', v: 'octopus', c: ['#f68aa8', '#ffe2ea', '#c85a7a'], f: ['blush'] },
    m: [
      { n: 'Pulpín', a: 'Chorro de tinta', d: 'Tiene ocho brazos para dar ocho abrazos.' },
      { n: 'Pulpazo', a: 'Tentáculos', d: 'Se esconde entre las rocas y cambia de color.', f: ['spots'], art: { c: ['#9a6ad0', '#ecdcff', '#6a3aa0'] } },
    ],
  },
  // 051-052 · Medusa
  {
    t: ['agua', 'electrico'],
    h: ['playa'],
    art: { k: 'jelly', v: 'jellyfish', c: ['#a8dafa', '#e8f8ff', '#f6d24a'], f: ['blush'] },
    m: [
      { n: 'Medusín', a: 'Calambre', d: 'Flota con las olas y brilla un poquito.' },
      { n: 'Medusona', a: 'Descarga marina', d: 'De noche ilumina el mar como una lámpara.', art: { c: ['#c8a8f8', '#f4ecff', '#f6d24a'], e: 'shine' } },
    ],
  },
  // 053-054 · Foca
  {
    t: ['agua', 'hielo'],
    h: ['playa', 'cumbre'],
    art: { k: 'quad', v: 'seal', c: ['#d8e2ec', '#ffffff', '#7a92aa'], f: ['whiskers', 'blush', 'nose'] },
    m: [
      { n: 'Focín', a: 'Bola de nieve', d: 'Le encanta deslizarse por el hielo.' },
      { n: 'Focazo', a: 'Ventisca', d: 'Aplaude con sus aletas cuando está feliz.', f: ['h-horn'], art: { c: ['#b8cce0', '#ffffff', '#5a7898', '#f4f0e0'] } },
    ],
  },
  // 055-056 · Pingüino
  {
    t: ['hielo', 'agua'],
    h: ['cumbre', 'playa'],
    art: { k: 'bird', v: 'penguin', c: ['#3a4a6a', '#ffffff', '#f6a832'], f: ['blush'] },
    m: [
      { n: 'Pingüín', a: 'Picotazo helado', d: 'Camina como un bebé. ¡Patina sobre su barriga!' },
      { n: 'Emperingüín', a: 'Rayo de escarcha', d: 'El rey del hielo. Lleva una corona brillante.', f: ['h-crown', 'neckpatch'] },
    ],
  },
  // 057-058 · Muñeco de nieve
  {
    t: ['hielo'],
    h: ['cumbre'],
    art: { k: 'blob', v: 'snowman', c: ['#f6f8ff', '#ffffff', '#e8524a'] },
    m: [
      { n: 'Nievín', a: 'Copos de nieve', d: 'Nació de una bola de nieve. Le encantan los abrazos fríos.' },
      { n: 'Nievazo', a: 'Alud', d: 'Si hace calor, se esconde en la cumbre.', f: ['arms', 'h-hat'] },
    ],
  },
  // 059-060 · Yeti
  {
    t: ['hielo', 'lucha'],
    h: ['cumbre'],
    art: { k: 'biped', v: 'yeti', c: ['#eaf2fa', '#bcd0e6', '#7aa6d8'], f: ['h-horns'] },
    m: [
      { n: 'Yetín', a: 'Puño helado', d: 'Un peludito de la montaña. Nadie lo ha visto dormir.' },
      { n: 'Yetazo', a: 'Avalancha', d: 'Su rugido se oye en todas las montañas.', f: ['fists'], art: { e: 'angry', p: { bw: 21, bh: 22 } } },
    ],
  },
  // 061-063 · Fantasma
  {
    t: ['fantasma'],
    h: ['bosque'],
    art: { k: 'ghost', v: 'sheet', c: ['#ece4fa', '#ffffff', '#9a7aca'], f: ['blush'], e: 'big', m: 'open' },
    m: [
      { n: 'Sustito', a: 'Susto', d: 'Le gusta dar sustos... ¡pero se asusta solito!' },
      { n: 'Sustón', a: 'Bu-bu', d: 'Atraviesa paredes para jugar al escondite.', art: { m: 'tongue', p: { w: 24 } } },
      {
        n: 'Espantón',
        a: 'Gran susto',
        d: 'El fantasma más grande del bosque. En el fondo es muy tierno.',
        f: ['h-crown', 'spots'],
        art: { c: ['#b8a2e2', '#efe6ff', '#6a4aa0'], p: { w: 25 } },
      },
    ],
  },
  // 064-065 · Sombra
  {
    t: ['fantasma'],
    h: ['bosque'],
    art: { k: 'ghost', v: 'shadow', c: ['#41325a', '#62527a', '#f8e040'] },
    m: [
      { n: 'Sombrín', a: 'Bola sombra', d: 'Vive en las sombras. Sus ojos brillan en la oscuridad.' },
      { n: 'Sombrón', a: 'Noche oscura', d: 'Si apagas la luz, aparece a tu lado. ¡Bu!', art: { c: ['#32244a', '#52426a', '#ff6a8a'] } },
    ],
  },
  // 066-068 · Dragón
  {
    t: ['dragon'],
    h: ['cumbre', 'volcan'],
    art: { k: 'dragon', v: 'baby', c: ['#7aaaf2', '#f8f0ca', '#5a78d0', '#f8d052'], f: ['h-horns', 'blush'] },
    m: [
      { n: 'Dragontín', a: 'Aliento de dragón', d: 'Un dragoncito que todavía no sabe volar.' },
      { n: 'Dragonero', a: 'Garra de dragón', d: 'Practica vuelos cada mañana en la cumbre.', drop: ['blush'], art: { v: 'wyvern' } },
      {
        n: 'Dragonarca',
        a: 'Cometa dragón',
        d: 'Vuela alrededor del mundo en un solo día.',
        t: ['dragon', 'aire'],
        f: ['spikes'],
        art: { e: 'angry' },
      },
    ],
  },
  // 069-070 · Unicornio
  {
    t: ['magia'],
    h: ['pradera'],
    art: {
      k: 'quad',
      v: 'horse',
      c: ['#f8f8ff', '#ffffff', '#f6a2d2', '#f8d244'],
      f: ['h-horn', 'mane', 't-fluffy', 'tail-a', 'e-pointy', 'ei-p'],
      e: 'shine',
    },
    m: [
      { n: 'Unicornín', a: 'Rayo arcoíris', d: 'Un potrillo mágico. Su cuerno brilla con los colores del arcoíris.' },
      { n: 'Unicornia', a: 'Galope estelar', d: 'Galopa por las nubes dejando estrellas.', f: ['wings'] },
    ],
  },
  // 071-072 · Bombilla
  {
    t: ['electrico'],
    h: ['pradera', 'montana'],
    art: { k: 'blob', v: 'bulb', c: ['#f8ee7a', '#fffbd8', '#a8a8b8'], f: ['blush'] },
    m: [
      { n: 'Bombillín', a: 'Destello', d: 'Cuando tiene una idea, ¡se enciende!' },
      { n: 'Bombillón', a: 'Megavatio', d: 'Da tanta luz que la noche parece de día.', f: ['arms'], art: { e: 'shine' } },
    ],
  },
  // 073-074 · Anguila
  {
    t: ['agua', 'electrico'],
    h: ['lago', 'playa'],
    art: { k: 'serpent', v: 'eel', c: ['#5a7ad0', '#f6ee86', '#f6e044'], f: ['fins', 'e-fin'] },
    m: [
      { n: 'Anguilín', a: 'Chispazo acuático', d: 'Nada como una cinta por el río.' },
      {
        n: 'Anguilazo',
        a: 'Trueno marino',
        d: 'Su cuerpo da calambres. ¡Cuidado al tocarlo!',
        f: ['spikes'],
        art: { e: 'angry', p: { thick: 9.5, head: 13 } },
      },
    ],
  },
  // 075-076 · Zanahoria
  {
    t: ['planta'],
    h: ['pradera'],
    art: { k: 'plant', v: 'carrot', c: ['#f8902e', '#f8c282', '#d46a1a'], f: ['blush'] },
    m: [
      { n: 'Zanahorín', a: 'Raíz fuerte', d: 'Se planta en la tierra para echarse la siesta.' },
      { n: 'Zanahorión', a: 'Lluvia de semillas', d: 'Ayuda a los huertos a crecer grandes y sanos.', f: ['arms'], art: { e: 'shine' } },
    ],
  },
  // 077-078 · Cactus
  {
    t: ['planta'],
    h: ['playa'],
    art: { k: 'plant', v: 'cactus', c: ['#5ab05a', '#b2e2a2', '#f67a9a'], f: ['blush'] },
    m: [
      { n: 'Cactín', a: 'Pinchitos', d: 'Vive en las dunas de la playa. Bebe muy poquita agua.' },
      {
        n: 'Cactazo',
        a: 'Puño espinoso',
        d: 'Boxea con sus brazos llenos de pinchos.',
        t: ['planta', 'lucha'],
        f: ['fists'],
        drop: ['blush'],
        art: { e: 'angry', c: ['#4a9a4a', '#a2d692', '#e84a3a'] },
      },
    ],
  },
  // 079-080 · Flor
  {
    t: ['planta', 'magia'],
    h: ['pradera'],
    art: { k: 'plant', v: 'flower', c: ['#f67aaa', '#f8e262', '#5ac04a'], f: ['blush'] },
    m: [
      { n: 'Florecita', a: 'Pétalos', d: 'Huele de maravilla. Las abejas la adoran.' },
      {
        n: 'Floriana',
        a: 'Danza de pétalos',
        d: 'Baila con el viento y llena el aire de pétalos.',
        f: ['h-crown'],
        art: { c: ['#b682f2', '#f8e262', '#5ac04a'], e: 'shine' },
      },
    ],
  },
  // 081-082 · Árbol
  {
    t: ['planta'],
    h: ['bosque'],
    art: { k: 'plant', v: 'tree', c: ['#58aa42', '#9ad272', '#3a7a2a', '#9a6a3a'] },
    m: [
      { n: 'Arbolito', a: 'Ramazo', d: 'Un árbol pequeñito que pasea por el bosque.' },
      {
        n: 'Arbolón',
        a: 'Raíces gigantes',
        d: 'Tiene cien años y cuenta cuentos a los pájaros.',
        t: ['planta', 'roca'],
        f: ['arms', 'flowers'],
        art: { e: 'sleepy' },
      },
    ],
  },
  // 083-084 · Boxeador
  {
    t: ['lucha'],
    h: ['montana'],
    art: { k: 'biped', v: 'boxer', c: ['#e8a272', '#f8e2c2', '#e83a3a', '#3a5ac8'], f: ['fists', 'h-band', 'e-round'] },
    m: [
      { n: 'Puñín', a: 'Puñetazo', d: 'Entrena todos los días para ser el más fuerte.' },
      { n: 'Puñazo', a: 'Gancho campeón', d: 'Ganó el gran torneo de la montaña.', f: ['belt'], art: { e: 'angry', p: { bw: 16, bh: 18 } } },
    ],
  },
  // 085-086 · Mono
  {
    t: ['lucha'],
    h: ['bosque'],
    art: { k: 'biped', v: 'monkey', c: ['#a86a3a', '#f8daaa', '#e84a3a'], f: ['e-round', 't-curly', 'ei-p'] },
    m: [
      { n: 'Monito', a: 'Golpe travieso', d: 'Le encanta columpiarse de rama en rama.' },
      {
        n: 'Monazo',
        a: 'Golpe de liana',
        d: 'El rey de la selva. ¡Hace reír a todos!',
        f: ['fists', 'h-tuft'],
        art: { e: 'shine', p: { arms: 2, bw: 15, bh: 17 } },
      },
    ],
  },
  // 087-088 · Cabra
  {
    t: ['roca', 'lucha'],
    h: ['montana'],
    art: { k: 'quad', v: 'goat', c: ['#f0e8da', '#ffffff', '#a08262', '#a08262'], f: ['h-horns', 'e-floppy', 'beard', 't-short'] },
    m: [
      { n: 'Chivín', a: 'Topetazo', d: 'Trepa por las rocas más empinadas.' },
      {
        n: 'Chivarrón',
        a: 'Embestida',
        d: 'Sus cuernos rizados son duros como el diamante.',
        f: ['h-curl'],
        drop: ['h-horns'],
        art: { v: 'ram', e: 'angry' },
      },
    ],
  },
  // 089-090 · Armadillo
  {
    t: ['roca'],
    h: ['montana'],
    art: { k: 'quad', v: 'armadillo', c: ['#ba9272', '#f0dac2', '#7a5a42'], f: ['bands', 'e-tiny', 't-thin'] },
    m: [
      { n: 'Armadín', a: 'Bola rodante', d: 'Se enrolla como una pelota cuando tiene miedo.' },
      { n: 'Armadillón', a: 'Rodillo', d: 'Rueda montaña abajo más rápido que el viento.', f: ['spikes'], art: { e: 'angry' } },
    ],
  },
  // 091-092 · Dinosaurio
  {
    t: ['roca', 'dragon'],
    h: ['montana', 'volcan'],
    art: { k: 'dragon', v: 'rex', c: ['#6aba6a', '#f2f2b2', '#f2a242'] },
    m: [
      { n: 'Dinín', a: 'Mordisco jurásico', d: '¡Un dinosaurio de verdad! Salió de un huevo de piedra.' },
      {
        n: 'Dinosaurón',
        a: 'Rugido prehistórico',
        d: 'Su rugido se oye desde el volcán.',
        f: ['spikes'],
        art: { e: 'angry', c: ['#4a9a6a', '#e2e8a2', '#f2a242'] },
      },
    ],
  },
  // 093-094 · Cristal
  {
    t: ['roca', 'magia'],
    h: ['montana', 'cumbre'],
    art: { k: 'rock', v: 'crystal', c: ['#a88af2', '#ecdcff', '#7a5ad0'], e: 'shine' },
    m: [
      { n: 'Cristalín', a: 'Brillo', d: 'Brilla con la luz de la luna.' },
      { n: 'Cristalazo', a: 'Prisma', d: 'Convierte la luz del sol en arcoíris.', art: { c: ['#6ad2f2', '#e2faff', '#3a9ad0'] } },
    ],
  },
  // 095-096 · Águila
  {
    t: ['aire'],
    h: ['montana'],
    art: { k: 'bird', v: 'eagle', c: ['#8a624a', '#f8f2e2', '#5a3a2a'] },
    m: [
      { n: 'Aguilín', a: 'Picado', d: 'Lo ve todo desde lo alto de las montañas.' },
      { n: 'Aguilón', a: 'Garra del cielo', d: 'Vuela más alto que las nubes.', art: { v: 'fly', e: 'angry' } },
    ],
  },
  // 097-098 · Nube
  {
    t: ['aire'],
    h: ['montana', 'cumbre'],
    art: { k: 'blob', v: 'cloud', c: ['#f8f8ff', '#ffffff', '#a8c8f2'], f: ['blush'] },
    m: [
      { n: 'Nubecita', a: 'Llovizna', d: 'Una nube esponjosa. Cuando llora, llueve.' },
      {
        n: 'Nubarrón',
        a: 'Tormenta',
        d: 'Ruge como un trueno, pero solo quiere jugar.',
        t: ['aire', 'electrico'],
        f: ['bolt'],
        drop: ['blush'],
        art: { c: ['#8a92aa', '#b8bed0', '#5a6280'], e: 'angry' },
      },
    ],
  },
  // 099-100 · Oso
  {
    t: ['normal'],
    h: ['bosque'],
    art: { k: 'quad', v: 'bear', c: ['#aa7248', '#eccaa2', '#6a4228'], f: ['e-round', 'nose'] },
    m: [
      { n: 'Osito', a: 'Abrazo de oso', d: 'Le encanta la miel. Siempre tiene la nariz pegajosa.' },
      { n: 'Osazo', a: 'Zarpazo de oso', d: 'Fuerte y cariñoso. Da los mejores abrazos.', t: ['normal', 'lucha'], art: { k: 'biped', v: 'bear' } },
    ],
  },
  // 101-102 · Búho
  {
    t: ['normal', 'aire'],
    h: ['bosque'],
    art: { k: 'bird', v: 'owl', c: ['#aa825a', '#f2e2c2', '#7a5a3a'], f: ['e-tuft'] },
    m: [
      { n: 'Buhíto', a: 'Mirada fija', d: 'Se queda despierto toda la noche.' },
      {
        n: 'Buhón',
        a: 'Hipnosis',
        d: 'Es muy sabio. ¡Sabe contar hasta mil!',
        t: ['aire', 'magia'],
        f: ['h-star'],
        art: { c: ['#6a6aaa', '#e2e2f8', '#4a4a82'] },
      },
    ],
  },
  // 103-104 · Mapache
  {
    t: ['normal'],
    h: ['bosque', 'lago'],
    art: { k: 'quad', v: 'cat', c: ['#a2a2aa', '#ececf2', '#42424a'], f: ['e-round', 'mask', 't-ring'], e: 'big', p: { snout: 0.3 } },
    m: [
      { n: 'Mapachín', a: 'Travesura', d: 'Lava su comida en el río antes de comer.' },
      { n: 'Mapachón', a: 'Golpe pícaro', d: 'Muy listo. ¡Sabe abrir cualquier mochila!', art: { p: { len: 25, leg: 13, snout: 0.35 } } },
    ],
  },
  // 105-106 · Pollito
  {
    t: ['normal', 'aire'],
    h: ['pradera'],
    art: { k: 'bird', v: 'chick', c: ['#f8e252', '#fff8c2', '#f69a32'], f: ['blush', 'h-tuft'] },
    m: [
      { n: 'Pollito', a: 'Pío pío', d: 'Sigue a todo el mundo pensando que es su mamá.' },
      {
        n: 'Gallazo',
        a: 'Kikirikí',
        d: 'Su canto despierta al sol cada mañana.',
        f: ['h-crest'],
        drop: ['h-tuft'],
        art: { v: 'perch', c: ['#f8f2e2', '#ffffff', '#e83a3a', '#e83a3a'] },
      },
    ],
  },
  // 107-108 · Iguana
  {
    t: ['fuego'],
    h: ['volcan'],
    art: { k: 'quad', v: 'lizard', c: ['#ea7a3a', '#f8d292', '#c84222'], f: ['spikes', 't-lizard'] },
    m: [
      { n: 'Iguanita', a: 'Lengua de fuego', d: 'Toma el sol sobre las rocas calentitas.' },
      {
        n: 'Iguanazo',
        a: 'Llama dragón',
        d: 'Cuando se enfada, sus escamas echan humo.',
        t: ['fuego', 'dragon'],
        f: ['h-horns'],
        art: { e: 'angry', c: ['#d84a2a', '#f8c272', '#8a2a1a', '#f8d24a'] },
      },
    ],
  },
  // 109-110 · Guindilla
  {
    t: ['fuego', 'planta'],
    h: ['volcan', 'pradera'],
    art: { k: 'plant', v: 'pepper', c: ['#e83a3a', '#f88a72', '#4ab04a'], f: ['blush'] },
    m: [
      { n: 'Chilín', a: 'Picante', d: '¡Pica muchísimo! Mejor no lo muerdas.' },
      { n: 'Chilazo', a: 'Súper picante', d: 'Cuando se enfada, le sale fuego por las orejas.', f: ['h-flame', 'arms'], art: { e: 'angry' } },
    ],
  },
  // 111-112 · Tortuga marina
  {
    t: ['agua', 'roca'],
    h: ['playa'],
    art: { k: 'shell', v: 'turtle', c: ['#6ab8a2', '#f2eac2', '#a87a52'] },
    m: [
      { n: 'Caparazín', a: 'Escudo de concha', d: 'Nace en la arena y corre hacia el mar.' },
      { n: 'Caparazón', a: 'Ola de roca', d: 'Lleva una islita con palmera en su espalda.', f: ['palm', 'spikes'] },
    ],
  },
  // 113-114 · Concha
  {
    t: ['agua'],
    h: ['playa'],
    art: { k: 'shell', v: 'clam', c: ['#f8b2c2', '#fff0f2', '#e07892', '#ffffff'], f: ['blush'] },
    m: [
      { n: 'Perlita', a: 'Perla brillante', d: 'Guarda una perla brillante junto a su concha.' },
      {
        n: 'Ostrón',
        a: 'Cierre de concha',
        d: 'Si te acercas mucho, ¡cierra la concha de golpe!',
        t: ['agua', 'roca'],
        f: ['spikes'],
        drop: ['blush'],
        art: { c: ['#a8a2c2', '#f0eef8', '#6a628a', '#ffffff'], e: 'angry' },
      },
    ],
  },
  // 115-116 · Ballena
  {
    t: ['agua'],
    h: ['playa'],
    art: { k: 'fish', v: 'whale', c: ['#5a8ada', '#e2f2ff', '#8ab8f2'], f: ['blush'] },
    m: [
      { n: 'Ballenita', a: 'Chorro', d: 'Echa agua por la cabeza cuando está feliz.' },
      { n: 'Ballenón', a: 'Gran ola', d: 'Es tan grande como un barco y canta canciones bonitas.', art: { c: ['#3a62b2', '#d2e6ff', '#6a98e2'] } },
    ],
  },
  // 117-118 · Oso polar
  {
    t: ['hielo'],
    h: ['cumbre'],
    art: { k: 'quad', v: 'bear', c: ['#f6f8ff', '#ffffff', '#5a9ad8'], f: ['e-round', 'nose', 'scarf'] },
    m: [
      { n: 'Polarcito', a: 'Garra helada', d: 'Nada en el agua helada sin tiritar.' },
      {
        n: 'Polarón',
        a: 'Abrazo polar',
        d: 'El más fuerte de la nieve... ¡pero muy dormilón!',
        t: ['hielo', 'lucha'],
        f: ['h-ice'],
        drop: ['scarf'],
        art: { k: 'biped', v: 'bear', e: 'sleepy' },
      },
    ],
  },
  // 119-120 · Canguro
  {
    t: ['lucha'],
    h: ['pradera'],
    art: { k: 'biped', v: 'kangaroo', c: ['#d89a5a', '#f8e2c2', '#e8423a'], f: ['e-long', 't-kanga', 'pouch', 'ei-p'] },
    m: [
      { n: 'Canguín', a: 'Saltito', d: 'Salta por toda la pradera sin cansarse.' },
      { n: 'Cangurazo', a: 'Doble patada', d: 'Usa su cola para dar saltos gigantes.', f: ['fists'], art: { e: 'angry' } },
    ],
  },

  // 121-144 · Vozimon sin evolución
  { t: ['bicho'], h: ['pradera'], art: { k: 'bug', v: 'beetle', c: ['#e83a3a', '#f8f8f8', '#24202a'], f: ['spots', 'blush'] }, m: [{ n: 'Lunarín', a: 'Vuelo rápido', d: 'Trae buena suerte. ¿Cuántos lunares tiene? ¡Cuéntalos!' }] },
  { t: ['normal'], h: ['pradera'], art: { k: 'quad', v: 'cow', c: ['#f8f8f2', '#f8c8c2', '#3a323a', '#e8e0c8'], f: ['spots', 'h-horns', 'e-floppy'] }, m: [{ n: 'Vaquita', a: 'Mugido', d: 'Da una leche riquísima con sabor a fresa.' }] },
  { t: ['normal'], h: ['pradera'], art: { k: 'quad', v: 'pig', c: ['#f8b2c2', '#ffe2ea', '#e87a92'], f: ['e-pointy', 't-curly', 'blush', 'ei-p'] }, m: [{ n: 'Cerdín', a: 'Revolcón', d: '¡Le encanta jugar en el barro!' }] },
  { t: ['normal'], h: ['bosque'], art: { k: 'biped', v: 'sloth', c: ['#baa282', '#ead8c2', '#7a6042'], f: ['claws'], e: 'sleepy' }, m: [{ n: 'Perezín', a: 'Bostezo', d: 'Se mueve muy, muy despacito. ¡Duerme veinte horas al día!' }] },
  { t: ['normal', 'planta'], h: ['bosque'], art: { k: 'quad', v: 'rodent', c: ['#d27a3a', '#f8e2c2', '#f8aa5a'], f: ['e-pointy', 't-fluffy', 'blush'] }, m: [{ n: 'Ardillín', a: 'Lanzabellotas', d: 'Esconde bellotas por todo el bosque... ¡y luego no se acuerda!' }] },
  { t: ['normal'], h: ['pradera'], art: { k: 'quad', v: 'rodent', c: ['#826a5a', '#f2dabb', '#54423a'], f: ['spikes', 'e-tiny', 'nose'], p: { snout: 0.35 } }, m: [{ n: 'Erizín', a: 'Bola de pinchos', d: 'Tiene pinchitos en la espalda, pero su barriga es suavecita.' }] },
  { t: ['aire', 'agua'], h: ['playa'], art: { k: 'bird', v: 'gull', c: ['#f8f8f8', '#ffffff', '#92a2ba'] }, m: [{ n: 'Gaviotín', a: 'Picada marina', d: 'Le encanta robar patatas fritas en la playa.' }] },
  { t: ['aire', 'planta'], h: ['pradera'], art: { k: 'bird', v: 'fly', c: ['#4aca9a', '#f8e2f2', '#f6528a'], f: ['longbeak'], p: { body: 14, head: 11 } }, m: [{ n: 'Colibrín', a: 'Néctar veloz', d: 'Mueve las alas tan rápido que zumban: ¡bzzz!' }] },
  { t: ['electrico'], h: ['pradera', 'montana'], art: { k: 'blob', v: 'battery', c: ['#f8c838', '#3a3a4a', '#4a4a5a'], f: ['blush'] }, m: [{ n: 'Baterín', a: 'Recarga', d: 'Siempre tiene energía. ¡Nunca se cansa de jugar!' }] },
  { t: ['hielo'], h: ['cumbre'], art: { k: 'blob', v: 'cube', c: ['#bae8f8', '#e8f8ff', '#7ac2ea'], f: ['blush'] }, m: [{ n: 'Cubito', a: 'Rayo frío', d: 'Un cubito de hielo muy fresquito. En verano se esconde.' }] },
  { t: ['fantasma', 'agua'], h: ['lago'], art: { k: 'ghost', v: 'mist', c: ['#cadaea', '#f2f8ff', '#8aaaca'], f: ['blush'] }, m: [{ n: 'Brumín', a: 'Niebla', d: 'Aparece por las mañanas sobre el lago.' }] },
  { t: ['agua', 'magia'], h: ['playa'], art: { k: 'blob', v: 'star', c: ['#f8a24a', '#f8d89a', '#e8603a'], f: ['dots', 'blush'] }, m: [{ n: 'Astromar', a: 'Giro estelar', d: 'Una estrella que se cayó al mar. De noche brilla.' }] },
  { t: ['agua'], h: ['playa'], art: { k: 'fish', v: 'shrimp', c: ['#f8927a', '#ffdaca', '#e8603a'] }, m: [{ n: 'Gambita', a: 'Pellizquito', d: 'Pequeña pero valiente. ¡Salta hacia atrás muy rápido!' }] },
  { t: ['agua'], h: ['playa'], art: { k: 'fish', v: 'dolphin', c: ['#7aaada', '#eaf2ff', '#527ab8'] }, m: [{ n: 'Delfinín', a: 'Salto acrobático', d: 'Muy listo y juguetón. Le encanta saltar olas.' }] },
  { t: ['planta', 'magia'], h: ['pradera'], art: { k: 'plant', v: 'strawberry', c: ['#e84a5a', '#f8a2aa', '#5ac24a', '#f8e272'], f: ['blush'] }, m: [{ n: 'Fresita', a: 'Dulzura', d: 'Huele a mermelada. ¡Qué rica!' }] },
  { t: ['planta'], h: ['bosque', 'pradera'], art: { k: 'plant', v: 'zucchini', c: ['#5aa24a', '#aada8a', '#3a7a2a', '#f8d24a'], f: ['arms'] }, m: [{ n: 'Calabacín', a: 'Rodar', d: 'Rueda por el huerto haciendo carreras.' }] },
  { t: ['agua', 'magia'], h: ['lago'], art: { k: 'blob', v: 'bubble', c: ['#aae2f8', '#f2fbff', '#f8aae2'], f: ['blush'] }, m: [{ n: 'Pompita', a: 'Pompas de jabón', d: 'Si la tocas... ¡plof! Y vuelve a aparecer.' }] },
  { t: ['magia'], h: ['pradera'], art: { k: 'blob', v: 'rainbow', c: ['#f8f8ff', '#ffffff', '#f87aa8'], f: ['blush'] }, m: [{ n: 'Arcoirín', a: 'Arcoíris', d: 'Aparece cuando sale el sol después de llover.' }] },
  {
    t: ['lucha', 'normal'],
    h: ['bosque'],
    art: { k: 'biped', v: 'panda', c: ['#f8f8f8', '#ffffff', '#32323a'], f: ['e-round', 'ears-a', 'limbs-a', 'patches', 'fists'], e: 'big' },
    m: [{ n: 'Pandita', a: 'Golpe de bambú', d: 'Come bambú y entrena kung-fu todos los días.' }],
  },
  { t: ['normal'], h: ['pradera', 'montana'], art: { k: 'quad', v: 'sheep', c: ['#f8f4ec', '#ffffff', '#5e565e'], f: ['wool', 'e-floppy', 'darkface'] }, m: [{ n: 'Lanita', a: 'Lana suave', d: 'Su lana es tan suave como una nube.' }] },
  { t: ['roca'], h: ['montana'], art: { k: 'quad', v: 'rhino', c: ['#92929a', '#cacad2', '#5a5a62', '#ece2d2'], f: ['e-tiny'] }, m: [{ n: 'Rinoroca', a: 'Cuernazo', d: 'Corre siempre en línea recta. ¡No sabe frenar!' }] },
  { t: ['agua'], h: ['lago'], art: { k: 'quad', v: 'otter', c: ['#aa7a52', '#f2dabb', '#724a2a'], f: ['e-tiny', 't-thin', 'whiskers', 'nose'] }, m: [{ n: 'Nutrín', a: 'Concha voladora', d: 'Duerme flotando en el río, de la mano de sus amigos.' }] },
  { t: ['normal', 'planta'], h: ['bosque'], art: { k: 'biped', v: 'koala', c: ['#aaaaba', '#eaeaf2', '#5a5a6a'], f: ['e-round', 'nose'], e: 'sleepy' }, m: [{ n: 'Koalín', a: 'Siesta', d: 'Abraza los árboles y duerme muchísimo.' }] },
  { t: ['agua'], h: ['playa'], art: { k: 'fish', v: 'shark', c: ['#7a9aba', '#f8f8f8', '#52688a'] }, m: [{ n: 'Tiburín', a: 'Mordisco marino', d: 'Un tiburoncito con muchos dientes, ¡pero solo come algas!' }] },

  // 145-150 · Legendarios (viven en lugares especiales del mundo)
  {
    t: ['electrico'],
    h: ['montana'],
    legendary: true,
    art: { k: 'quad', v: 'ram', c: ['#f8e062', '#fff8d2', '#4a5aa8', '#4ab8f8'], f: ['h-curl', 'mane', 't-bolt', 'bolt', 'aura'], e: 'angry' },
    m: [{ n: 'Tronador', a: 'Trueno real', d: 'El señor de las tormentas. Vive en lo alto de la montaña.' }],
  },
  {
    t: ['hielo', 'aire'],
    h: ['cumbre'],
    legendary: true,
    art: { k: 'bird', v: 'phoenix', c: ['#a8e2f8', '#f2fbff', '#5a9ae2', '#ffffff'], f: ['h-crest', 'aura'], e: 'shine' },
    m: [{ n: 'Glaciela', a: 'Ventisca eterna', d: 'Un ave de hielo. Cuando vuela, empieza a nevar.' }],
  },
  {
    t: ['fuego', 'dragon'],
    h: ['volcan'],
    legendary: true,
    art: { k: 'dragon', v: 'wyvern', c: ['#e24a2a', '#f8ca62', '#8a2a1a', '#ffd042'], f: ['h-horns', 'spikes', 't-flame', 'aura'], e: 'angry' },
    m: [{ n: 'Volcarex', a: 'Fuego volcánico', d: 'Duerme dentro del gran volcán desde hace mil años.' }],
  },
  {
    t: ['agua', 'dragon'],
    h: ['playa'],
    legendary: true,
    art: { k: 'serpent', v: 'sea', c: ['#3a6aca', '#aae2f8', '#f8f8f8', '#5ad8ca'], f: ['h-horns', 'fins', 'spikes', 'e-fin', 'aura'], e: 'angry', p: { thick: 10, head: 13 } },
    m: [{ n: 'Mareón', a: 'Maremoto', d: 'El guardián del mar. Las olas le obedecen.' }],
  },
  {
    t: ['planta', 'magia'],
    h: ['bosque'],
    legendary: true,
    art: { k: 'quad', v: 'lion', c: ['#f2d272', '#fff6ca', '#4aaa4a', '#f87aaa'], f: ['mane', 'e-round', 't-leaf', 'aura', 'flowers'], e: 'shine' },
    m: [{ n: 'Silvaleón', a: 'Raíz sagrada', d: 'El protector del bosque. Su melena está hecha de hojas.' }],
  },
  {
    t: ['magia', 'dragon'],
    h: ['lago'],
    legendary: true,
    art: { k: 'serpent', v: 'sky', c: ['#f8f8ff', '#ffe2f2', '#f87aca', '#7ad8f8'], f: ['h-horns', 'whiskers-long', 'e-fin', 'aura', 'spikes'], e: 'shine', p: { thick: 9, head: 13 } },
    m: [{ n: 'Aurorón', a: 'Aurora', d: 'Pinta el cielo de colores por la noche.' }],
  },

  // 151 · Mítico
  {
    t: ['magia'],
    h: ['pradera'],
    mythical: true,
    art: { k: 'blob', v: 'star', c: ['#f8b8e2', '#fff0f8', '#f8d042'], f: ['aura', 'blush', 'float'], e: 'shine' },
    m: [{ n: 'Estrellín', a: 'Deseo', d: 'Dicen que si lo ves, se cumple un deseo.' }],
  },
];

function owKind(art: ArtSpec, types: Elem[]): OwKind {
  switch (art.k) {
    case 'bird':
      return 'bird';
    case 'winged':
      return art.v === 'butterfly' ? 'bug' : 'bird';
    case 'fish':
    case 'jelly':
    case 'shell':
      return 'water';
    case 'bug':
      return 'bug';
    case 'ghost':
      return 'ghost';
    case 'plant':
      return 'plant';
    default:
      return types[0] === 'agua' ? 'water' : 'land';
  }
}

function build(): Species[] {
  const out: Species[] = [];
  for (const fd of FAMILIES) {
    const n = fd.m.length;
    let art: ArtSpec = { ...fd.art, f: [...(fd.art.f ?? [])] };
    let types = fd.t;
    let habitats = fd.h;
    fd.m.forEach((m, i) => {
      if (m.art) art = { ...art, ...m.art, f: art.f };
      let feats = [...(art.f ?? []), ...(m.f ?? [])];
      if (m.drop) feats = feats.filter((x) => !m.drop!.includes(x));
      art = { ...art, f: feats };
      if (m.t) types = m.t;
      if (m.h) habitats = m.h;

      const special = !!(fd.legendary || fd.mythical);
      let pow: number;
      if (fd.mythical) pow = 10;
      else if (fd.legendary) pow = 9;
      else if (fd.starter) pow = [3, 5, 8][i];
      else if (n === 1) pow = 4;
      else if (n === 2) pow = [2, 5][i];
      else pow = [2, 4, 7][i];

      let rarity = special ? 0 : n === 1 ? 5 : n === 2 ? [10, 3][i] : [10, 4, 1.5][i];
      if (fd.starter) rarity *= 0.3;

      const scale = special ? 1 : n === 1 ? 0.88 : n === 2 ? [0.76, 0.96][i] : [0.7, 0.86, 1][i];

      out.push({
        id: out.length + 1,
        name: m.n,
        types: [...types],
        attack: m.a,
        habitats: [...habitats],
        desc: m.d,
        stage: i + 1,
        family: n,
        pow,
        rarity,
        art: { ...art, s: art.s ?? scale },
        ow: fd.mythical ? 'ghost' : owKind(art, types),
        legendary: !!fd.legendary,
        mythical: !!fd.mythical,
      });
    });
  }
  return out;
}

export const SPECIES: Species[] = build();
export const TOTAL = SPECIES.length;
export const STARTERS = [1, 4, 7];
export const MYTHICAL_ID = SPECIES.find((s) => s.mythical)!.id;
export const LEGENDARY_IDS = SPECIES.filter((s) => s.legendary).map((s) => s.id);

export function getSpecies(id: number): Species {
  const s = SPECIES[id - 1];
  if (!s) throw new Error(`Unknown species #${id}`);
  return s;
}

export const dexNumber = (id: number) => '#' + String(id).padStart(3, '0');
