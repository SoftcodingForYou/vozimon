# Vozimón brand

The full brand package, kept for later use (the game, the README, social media, print).
Use the SVGs wherever possible: they scale to any size; the PNGs are ready-made renders.

## Shapes

| Name | What it is | Good for |
| --- | --- | --- |
| `vozimon-logo` | Horizontal logo: "Vozi" in the orange speech bubble + "món" with the star ball as the ó | Wide spaces: title screen, headers, banners |
| `vozimon-logotipo-apilado` | Stacked logo: "Vozi" bubble above "món" | Square-ish spaces, posters, covers |
| `vozimon-isotipo` | Just the mark: the star ball with its pink accent | Small spaces, avatars, stamps |
| `vozimon-bola-estrella` | The star ball on its own (no accent) | Decoration, loading, "caught" marks |
| `vozimon-app-icon` | The star ball on sky and hills, rounded square | App and store icons |

## Colour versions (`svg/` and `png/`)

- *(no suffix)*: full colour, with a cream halo; works on light and dark backgrounds.
- `-blanco`: all white, for dark or photo backgrounds.
- `-tinta`: all ink (#2a2238), for light backgrounds, stamps and one-colour print.

## Profile pictures (`perfil-svg/`, `perfil-1080/` = 1080×1080 PNG)

The stacked logo (`logotipo`) or the mark (`isotipo`) on a square background:
`cielo` (sky and hills), `noche` (night, #241c38, with little stars) or `papel` (paper, #fffdf4).

## Web icons (`web/`)

`favicon.svg`, `favicon-16/32/48.png`, `apple-touch-icon.png` (180), `icon-192/512/1024.png`.
The game serves copies of the ones it uses from `public/` (Vite only serves that folder):
`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png` and `icon-512.png`.
If the icons change here, copy them there too.

## Colours

| Token (`src/styles.css`) | Hex | Role |
| --- | --- | --- |
| `--ink` | #2a2238 | every outline and the solid "depth" under shapes |
| `--night` | #241c38 | dark backgrounds |
| `--paper` | #fffdf4 | cream: letters, halos, panels |
| `--orange` | #ff7a3d | "Vozi": the voice (reading aloud) |
| `--blue` / `--blue-dark` | #3f8ef0 / #3a76c8 | "món" |
| `--star` / `--gold` | #f8d038 / #e09020 | the star ball |
| `--pink` | #f07fc0 | the accent, sparkles |
| `--sky` / `--sky-light` | #4aa8f2 / #a8e0ff | sky |
| `--grass` / `--grass-dark` | #8ed060 / #6aba4a | hills |

Don't redraw, recolour or retype the logo: use these files as they are.
