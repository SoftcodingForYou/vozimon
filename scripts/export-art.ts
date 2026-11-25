/**
 * Exports every Vozimon portrait as a PNG file into src/art/
 * (named like "001-chispin.png": Vozidex number + name without accents).
 *
 *   npm run export-art          -> 224x224 px (4x, crisp pixels)
 *   npm run export-art -- 1     -> 56x56 px (original pixel size)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { SPECIES } from '../src/game/creatures';
import { drawCreature } from '../src/art/creatureArt';
import type { PixelImage } from '../src/art/raster';

const scale = Math.max(1, Math.floor(Number(process.argv[2] ?? 4)) || 4);
const outDir = path.join(process.cwd(), 'src', 'art');
const EXPORTED = /^\d{3}-[a-z0-9-]+\.png$/;

export function fileName(id: number, name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${String(id).padStart(3, '0')}-${ascii}.png`;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** RGBA PNG, scaled up with nearest-neighbour so the pixels stay crisp. */
function encodePng(img: PixelImage, k: number): Buffer {
  const w = img.w * k;
  const h = img.h * k;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0; // no filter
    for (let x = 0; x < w; x++) {
      const src = (Math.floor(y / k) * img.w + Math.floor(x / k)) * 4;
      raw.set(img.data.subarray(src, src + 4), row + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Remove earlier exports so renamed creatures don't leave stale files behind.
for (const f of fs.readdirSync(outDir)) if (EXPORTED.test(f)) fs.unlinkSync(path.join(outDir, f));

const names = new Set<string>();
for (const s of SPECIES) {
  const file = fileName(s.id, s.name);
  if (names.has(file)) throw new Error(`Two creatures would share the file name ${file}`);
  names.add(file);
  fs.writeFileSync(path.join(outDir, file), encodePng(drawCreature(s.art, s.stage), scale));
}

const size = 56 * scale;
console.log(`Exported ${names.size} portraits (${size}x${size} px) to ${path.relative(process.cwd(), outDir)}/`);
