# Vozimón

An educational creature-collecting game in Spanish for children aged 4–6, in the spirit of the
classic Game Boy monster-collecting games. All creatures, names, art, sounds and music are
**original**: never add Pokémon/Nintendo names, characters, sprites, music or their specific look
(not even "for testing"). Mechanics of the genre are fine.

## Product requirements (from the client)

- Two modes, chosen when starting a new game. The choice is hidden for now (`SHOW_MODE_CHOICE` in
  `NewGame.tsx`): new games are always Normal and go straight from the name to the map; games saved
  in Fácil keep playing as Fácil.
  - **Normal**: free roaming in an open world with an empty Vozidex plus one starter companion
    (choice of three). Wild Vozimón are chased and met in the world. To fight, the child picks
    one of their caught creatures from a list (name + picture). Fights are turn-based, each
    creature has one representative attack. Before a fighter is out the menu is "Atacar" / "Huir"
    ("Atacar" then asks who fights); during the fight it just says "Atacar" (with the attack's
    type badge), "Cambiar" and "Huir"; the attack's own name shows when it happens ("¡X usa Y!")
    and stays up until its animation is over (a held caption, `TextBox hold`). Attack names are
    shown with every word capitalised ("Bola De Fuego", `Species.attackName`; `attack` stays the
    key of its animation recipe). After winning, the star ball ("bola estrella", unlimited) catches it.
  - **Fácil** (for 4-year-olds): no fights, just throw the star ball (unlimited). The catch chance
    goes down with the Vozidex number (92% → 18%); after breaking free it may run away (5% → 35%).
- 151 creatures: #145–150 are legendaries living at fixed spots (the world map stars the ones
  still waiting; caught ones simply disappear from it). After a battle that isn't a catch, a
  legendary goes away for a short while (`spotCooldown`, 25 s); meanwhile a wooden sign stands at
  its home and walking into it says "¡X se fue! Tal vez vuelva pronto." (`signAt`). #151 (the mythical, Estrellín)
  appears only once all other 150 are caught: then exactly one roams the whole world for good
  (any zone, stairs and bridges; it follows routes to far-away places), is marked on the world map,
  and is 5× as tough in battle (`MYTHICAL_TOUGHNESS`, health only). If it gets away it reappears
  somewhere far; once caught it is gone. It never appears in the tall grass. Other creatures spawn
  as usual either way. In the world it shows the same golden sparkles as the legendaries.
- Secret code (never shown to players): typing `eduboss` while the in-game menu (Q) is open (and
  only then) unlocks everything for that save (`SaveSlot.allUnlocked`, `WorldState.unlockAll`): the
  game behaves as if all 150 were caught (e.g. #151 roams), without adding anything to the Vozidex.
  Typing it again switches it off, leaving only what was really earned.
- Vozidex: names and portraits stay hidden ("???") until met. Star-ball icon = caught,
  eye icon = only seen. Always in Vozidex-number order. Catching a creature for the first time
  shows its new Vozidex page right after "¡X se ha guardado en tu Vozidex!" (Action or Cancel goes
  back to the world; with reading aloud on, only after the name was read). A caught creature's
  page shows its wins / fights.
- Fight records (`SaveSlot.record`): a fight counts when the child sends an Vozimón out (once per
  battle); the win goes to the one that knocks out the wild creature. The fighter list is sorted
  by fights (most used first; never-used ones follow in Vozidex order), fixed for the whole battle,
  and each card shows wins / fights in its corner. After a K.O. the message itself throws the
  star ball (Action or Cancel), since catching is certain then: no menu.
- Save slots ("partidas"): each new game gets a name, which must be unique (case-insensitive).
  Everything is stored in the browser's `localStorage` and the chosen slot is always overwritten.
  The Vozidex (seen/caught) is saved on every change. The exact game state (player position and
  direction, wild creatures, legendary cooldowns, random generator, step counter) is saved every
  5th step, after every battle and when the game is left, hidden or closed. Loading a slot resumes
  exactly there; a brand-new game starts on a random road.
  A game can be exported to a `.vozimon` file (JSON: Vozidex, records, unlock flag and the world
  snapshot; `exportGame`) via "Guardar en un archivo" in its dialog, and imported via "Cargar de un
  archivo" in the game list (`parseExport` → `importGame`): the player always types a new unique name
  (never the file name or the stored one) and it becomes an ordinary new slot; the file isn't needed
  afterwards. Files from before the rename (`.edumon`, format `edumon-partida`) still load. File
  dialogs live in `system/files.ts`.
- Two worlds; the map is chosen once when creating a game and stored on the slot (`SaveSlot.map`):
  - **Estaciones** (the original world): roads, grass, tall grass (random encounters), mountains
    with stairs and a snowy peak, beaches (water creatures; no swimming), two volcanoes, lake with
    island, river, forest. Its zones are the 7 habitats (creatures live by `habitats`).
  - **Santiago**: an abstract Santiago de Chile with 13 districts (comunas), one per type; only
    creatures of that type live there (`Zone.type`). Santiago Centro = Normal, Cajón del Maipo =
    Fuego (Volcán San José), Vitacura = Agua (Parque Bicentenario lagoon), La Florida = Planta,
    Estación Central = Eléctrico (railway), Lo Barnechea = Hielo (Farellones), Puente Alto = Roca,
    Pudahuel = Aire (airport), La Pintana = Bicho (farmland), Recoleta = Fantasma (Cementerio
    General), Ñuñoa = Lucha (Estadio Nacional), Quinta Normal = Dragón (natural history museum),
    Providencia = Magia (Cerro San Cristóbal). Building roofs take the district's type colour,
    the world map tints the districts, and walking into one shows its name and type.
- In the world, creatures use generic sprites (land, bird, water, bug, ghost, plant) so their
  looks stay secret: every creature of a kind looks exactly the same (fixed colours per kind,
  `OW_COLORS`); battles and the Vozidex show full-body portraits.
- Controls are minimal: arrows, A (default Space, shown as "Espacio"), B (default X; hold B to run), Q = menu (its own
  key, never the action button), E = Vozidex, T = type chart ("Tipos", who is very effective
  against whom) and M = world map. Every button answers to exactly one key (no extra fallback
  keys); the only exception is typing a name, where Intro confirms, Esc goes back and Retroceso
  erases (letter keys write letters there). All keys can be changed in Ajustes → Avanzado → Teclas. On-screen hints always show
  the key the player chose (or round buttons when playing by touch: ✓ for A, ✗ for B, ☰/E/T/M; a gamepad shows A/B); the HUD
  shows Menú, Vozidex, Tipos and Mapa stacked top-right and they can be tapped. The in-game menu only
  manages the game and its settings (Ajustes, Salir, Seguir); the Vozidex has its own shortcut. Touch D-pad + ✓ (A, green) / ✗ (B, red)
  buttons on tablets/phones — no letters, they confuse young children; gamepads also work.
- Ajustes has two levels. The standard list: Micrófono (the setup check, in red while a voice
  feature is on and it isn't ready), Leer en voz alta, Jugar con la voz, Música, Sonidos, Avanzado,
  Volver. Avanzado: Letra, Mayúsculas, Teclas, Pantalla completa, Volver (B goes back up).
- Reading: Ajustes → Avanzado → Letra switches between the clear "Fina" font (Andika, made for beginning
  readers; the default) and the retro "Píxel" font, and Avanzado → Mayúsculas shows every text in
  capitals (default off). The goal is to teach reading, especially the creature names, so names
  are never cut off: they shrink to fit (`FitText` in `ui.tsx`).
- Reading names out loud (Ajustes → "Leer en voz alta", `Settings.reading`, **on by default**;
  switching it back on shows a confirmation for grown-ups): every known (seen or caught) creature's
  Vozidex page (also the new one after a first catch) has a "🎤 Leer" button. Until the name was read once it is
  selected (Action reads); afterwards Action does the usual and the button is chosen with up/down
  or tapped. On the new page after a catch the reading is a one-time pass (asked every time, even
  for a name already read while only seen): the page can't be left before it (until the ✕ shows),
  and afterwards the button is gone; reading again happens later in the Vozidex. The browser's speech recognition
  (`system/listen.ts`; Chrome/Edge on-device when its Spanish pack is there, else Google's/Microsoft's
  service; Safari: Apple's; Firefox: none) listens in `es-CL` while music and sounds are muted. It
  keeps listening across pauses (children read syllable by syllable; pieces are joined) and stops
  2.2 s after the child stops talking (9 s at most). `heardName` (`game/reading.ts`) compares by
  sound and generously, since beginning readers (and foreign accents) can't pronounce perfectly:
  v/b, z/s, ll/y and accents are the same; close sounds cost about a third of a mistake (e/i, o/u,
  r/l, n/m, d/t, b/p, k/g, ch/s), other vowels, r/d, sh-like sounds about half; a swallowed s or d,
  or the r/l of a cluster ("tr" → "t") cost half; words run together and real-word completions
  ("Trinidad" for Trinín) count. 60 % alike is enough, a little less after each miss (55 % at
  least). It never takes a much shorter piece, nor another Vozimón's name (a reading that sounds
  the same as another name, or clearly more like it; a near tie counts for the name on screen).
  While it listens, the microphone shows how loud it hears (`system/micLevel.ts` → `useMicLevel`,
  CSS `--lvl` 0..1 and `data-speaking`): the reading microphone fills up and orange rings spread, the
  voice microphones glow, the mic test has a level bar. On desktop Chrome / Edge a second,
  echo-cancelled capture is measured; elsewhere (Safari, phones, tablets: a second capture can
  disturb the recogniser there) the recogniser's events give steps (sound, voice, words).
  What was heard is logged to the console (`[Vozimón] Leer`) and,
  with `?debug`, shown on the syllables screen. Read → stars and
  "¡Muy bien!", saved in `SaveSlot.read` (a star on the page, in the grid and a count in the header).
  Not understood → only the name in coloured syllables (`syllables`) and "Otra vez". A ✕ in the
  overlay's top-right corner (or B) gives up without a star: when practising in the Vozidex it is
  always there; on the new page after a catch only after 3 misses (`TRIES_BEFORE_SKIP`). Only when
  nothing can listen (no recognition, no microphone permission, microphone broken) a grown-up
  confirms with "✓ Lo leyó bien" (with a short note why). So grown-ups find problems before playing, a
  setup check (`checkListening` / `listenStatus` in `listen.ts`, `components/SpeechCheck.tsx`) looks
  at the browser, microphone permission, the on-device Spanish pack, internet and the last listening
  error (`vozimon.voz.v1`, kept until listening works again). With reading (or playing by voice) on,
  the title screen shows a small warning when something is missing (tap it), and starting pops the
  check up (once per visit; its "Jugar" goes on to the game list). The game list has its own
  microphone item (between "Cargar de un archivo" and "Ajustes"): red "¡Configura el micrófono!" /
  "Este navegador no escucha" while a voice feature is on and listening isn't ready, else "Micrófono:
  listo". It and Ajustes → Micrófono always open the check, which offers "Dar permiso", "Descargar
  voz" and a "Probar" test. It also opens right after reading or playing by voice is switched on.
  Child-facing texts here stay a word or two: the children are just learning to read.
- Playing by voice (Ajustes → "Jugar con la voz", `Settings.voice`, **off by default**; switching it
  on asks a grown-up to confirm, then the mic check opens). While a game is open, one continuous
  recogniser (`system/voice.ts`) listens for the words of the screen on top; screens register them
  with `useVoice(spec, layer, active)`, layered like `useInput` (only the top one is asked; words
  first, then names). Words (`SAY`, matched by sound with `wordScore` ≥ 0.8, so «mamá» isn't «mapa»):
  in the world «mapa», «vozidex», «tipos» open them; «cerrar», «cancelar», «volver» close the map,
  Tipos, the Vozidex and the fighter list (on a Vozidex page «volver» goes back to the grid, like B).
  In battles «atacar»/«luchar», «cambiar», «huir», «lanzar» (easy mode) choose; the choices then pop
  up as a wide panel with big buttons at the bottom (`.bvoice`, below the health panels) instead of
  the small corner menu. Calling a Vozimón by its name (`bestName`) picks it in the fighter list
  (a tired one just beeps) and opens its page in the Vozidex (seen ones; no star: stars only come
  from «Leer»), where «leer» starts the reading. Messages still go on with a tap or key. Each
  recognised result acts once (so «mapa» can't close the map it just opened); what was understood
  shows in an orange speech bubble (`VoiceHeard`) and is logged (`[Vozimón] Voz`); the HUD shows a
  mic badge (`VoiceBadge`, crossed out when it can't listen; a tap tries again). The music keeps
  playing; reading a name or the mic test take the microphone over (`claimMic` in
  `system/recognizer.ts`) and the listener resumes afterwards. It restarts when the browser ends a
  recognition, backs off after errors and notes them for the setup check.
- Tipos (type chart): just the list of the 13 types, all on screen without scrolling.
- Battles: every one of the 151 attacks has its own signature animation and sound
  (`game/attacks.ts` recipe → `components/AttackFx.tsx`): a motion (arc, stream, beam, whirlwind,
  rain, dig, bite, slash, meteor, wrap...) with particle shapes, count, size and colours.
  Evolutions keep their family's motif but grow; colours and the base sound follow the attack's
  type so children still recognise types. Very effective hits (and big attacks) shake the screen;
  a knocked-out creature shows dizzy stars ("K.O."). `?demo=attacks` plays all 151 in a row.
- React + TypeScript + Vite (npm), runs in any modern browser.

## Commands

- `npm install` · `npm run dev` · `npm run build` · `npm run preview` · `npm test` · `npm run typecheck`
- `npm run export-art` regenerates the portrait PNGs in `src/art/` (`001-chispin.png` …, 224×224;
  `npm run export-art -- 1` for the original 56×56). Run it after changing creature art or names.
- `npm run record-attacks` records the presentation video of all 151 attacks (normal speed, with
  sound) into `preview/vozimon-ataques.mp4` (git-ignored). Needs Firefox 129+ and ffmpeg; options
  `FROM`/`TO`, `WORKERS`, `FPS`, `OUT`, `FIREFOX` (see `scripts/record-attacks.mjs`).
- Test URLs (throwaway save, nothing stored): `?demo=world|battle|dex|types|map|slots|new|attacks` with
  optional `&sp=25&mode=easy&biome=4&caught=12&team=1,4,7&font=pixel&upper=1&reading=0&voice=1&map=santiago`
  (`biome=7` is the city battle background). `?debug` exposes the world state as `window.__vozi.world`
  and `window.__vozi.say('mapa')`, which acts as if that had been heard (playing by voice without a
  microphone; needs `voice=1`).

## Brand (`brand/`, repo root)

The whole Vozimón brand package: horizontal logo, stacked logo, mark (isotipo), star ball and app
icon in colour / white (`-blanco`) / ink (`-tinta`), as SVG and PNG, square profile pictures and web
icons. `brand/README.md` says which file is for what. The title screen imports
`brand/svg/vozimon-logo.svg` directly; the icons the page uses are copies in `public/` (favicon,
apple-touch-icon, `manifest.webmanifest` icons), because Vite only serves that folder.

## Architecture (src/)

- `game/` – `creatures.ts` (roster as evolution families; numbers are assigned in list order),
  `elements.ts` (types + type chart), `battle.ts` (damage and catch math), `save.ts` (slots and
  settings), `reading.ts` (does what was heard sound like the name / a command word / which name was
  called? + syllables), `rng.ts`.
- `art/` – `raster.ts` (shape rasterizer with automatic outline/shading), `creatureArt.ts`
  (14 archetypes → 56×56 portraits), `sprites.ts` (hand-drawn 16×16 player, generic creatures,
  star ball), `assets.ts` (browser image caches).
- `world/` – `maps.ts` (`getWorldMap(id)`), `mapgen.ts` (the Estaciones world from `WORLD_SEED`),
  `santiago.ts` (the Santiago world: districts, rivers, landmarks, city blocks), `mapkit.ts` (shared
  generator steps: roads, cliffs/stairs, reachability), `tiles.ts` (terrain, biomes, zones, map ids,
  `canStep` movement rule), `tileArt.ts`, `world.ts` (simulation: movement, zone-based spawning,
  encounters), `renderer.ts` (canvas drawing).
- `system/` – `keys.ts` (buttons, default keys, key → button, labels, rebinding), `input.ts` (layered
  input handlers, key capture, keyboard/touch/gamepad source), `audio.ts` (Web Audio SFX, per-type
  attack sounds, original chiptunes), `files.ts` (save-to-folder / pick-a-file dialogs),
  `recognizer.ts` (the shared Web Speech plumbing: recogniser, languages, on-device Spanish, last
  failure, who has the microphone), `listen.ts` (reading names out loud, the setup check and mic test),
  `voice.ts` (playing by voice: the continuous command listener, `useVoice`, `SAY` words),
  `micLevel.ts` (how loud the microphone hears, for the level animation).
- `components/` – React screens: TitleScreen, SlotMenu, NewGame, Play (saving/resuming, HUD),
  WorldView, Battle, AttackFx (signature attack effects + KO stars; shapes in `fxParticles.tsx`),
  AttackShowcase (`?demo=attacks`, seekable for recording), CreaturePicker, Dex, ReadAloud
  (reading a name out loud), TypeChart,
  WorldMapView, SettingsPanel (standard + Avanzado), SpeechCheck (mic setup check), KeyBindingsPanel,
  TouchControls, shared `ui.tsx` (Menu with optional `voice`, TextBox, KeyCap hints, type badges with
  icons, VoiceMic / VoiceBadge / VoiceHeard).

## Conventions

- The game is called **Vozimón** (accent on the o; plural stays "los Vozimón") in all player-facing
  text and docs (its book is the **Vozidex**). Code identifiers, the npm package name, the repo
  (`vozimon`) and the `vozimon.` storage keys stay ASCII. The game was called Edumón before (and
  Educatiomon before that): saves under `edumon.`/`educatiomon.` keys move to `vozimon.` on start
  (`migrateOldSaves`); don't drop that. The secret code `eduboss` kept its old name.
- Brand look: use the colour tokens in `:root` (`styles.css`): ink outlines, paper, orange
  (`--orange`, "Vozi", the voice, so reading aloud uses it: the "Leer" button is its speech bubble), blue,
  star yellow/gold, pink, sky and grass. The sticker style is an ink outline plus a solid ink copy
  just below (`--depth` for boxes, `--lettering` for big titles). The logo is an image: never
  redraw, recolour or retype it. The manifest keeps `display: browser` because an iOS home-screen
  app gets storage of its own and wouldn't see the saved games.
- All player-facing text is Spanish, short and encouraging. There is no voice-over (the client
  removed text-to-speech because it didn't sound human); don't add it back.
- Every screen/overlay listens with `useInput(handler, LAYER.x)`; the highest layer wins.
- Never hard-code key names in hints: use `<A />`, `<Bb />`, `<Qq />`, `<Ee />`, `<Tt />`, `<Mm />`, `<DirKeys />`
  (they follow the player's key bindings and input device).
- Nothing may hide behind scrolling without showing it (children don't discover it): fit content
  on screen where possible; long lists use `<Menu scroll>` or `<ScrollBar>` (`ui.tsx`), our own
  always-visible bar (iOS hides native scroll bars). Small boxes like the battle menu keep each
  option on one line (`<Menu oneLine>`, shrinks to fit) so they never overflow.
- The stage is 768×576 logical px (world canvas 256×192 drawn at 3×), scaled to fit the window.
- iOS Safari can wipe canvases when memory runs short (this caused a black world after battles).
  Don't keep big long-lived canvases: the world background is copied each frame from plain
  `ImageData` (`getMapPixels`), the world gets a fresh canvas and sprites whenever it shows again
  (`refreshWorldArt`), and temporary canvases are freed with `releaseCanvas`.
- Font sizes in `styles.css` are written as `calc(Npx * var(--fs, 1))`: `--fs` shrinks the wider
  fine font so both letter styles fit the same boxes. Check new screens in both styles and in capitals.
- Vozidex numbers come from the order of `FAMILIES`, and saves store those numbers: inserting or
  reordering creatures changes what existing saves point to. Keep the order stable.
- Saved world states only load into the exact same generated map (`WorldMap.id`). A test pins a
  checksum of Estaciones: changing its generator moves every saved player. Santiago's district
  order (`DISTRICTS`) is its zone numbering; keep it stable too.
- `npm test` checks the roster, rules, saves and world (e.g. every portrait fits its frame,
  every legendary home is reachable).
