// Records the presentation video of all 151 signature attacks (?demo=attacks) at normal speed,
// with sound:  npm run record-attacks   ->  preview/vozimon-ataques.mp4 (git-ignored)
//
// How: a Vite dev server serves the game; headless Firefox opens the attack preview in capture
// mode and steps every animation to each frame's moment (window.__fx.seek), so the result is
// exact and independent of the machine's speed. The soundtrack is rendered offline in the same
// page (window.__fx.audio) and ffmpeg puts both together.
//
// Needs: Firefox 129+ and ffmpeg on the machine.
// Options (environment variables):
//   FIREFOX=/path/to/firefox   which Firefox to use (default: looked up in the usual places)
//   WORKERS=4                  browsers recording in parallel
//   FPS=25                     frames per second (each attack's 2.6 s slot must be a whole number of frames)
//   FROM=1 TO=151              record only some attacks (e.g. to check a few)
//   OUT=preview/vozimon-ataques.mp4   where to write the video

import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.resolve(ROOT, process.env.OUT ?? 'preview/vozimon-ataques.mp4');
const OUT_DIR = path.dirname(OUT);
const CLIP = 2600; // must match CLIP in src/components/AttackShowcase.tsx
const FPS = Number(process.env.FPS ?? 25);
const WORKERS = Math.max(1, Number(process.env.WORKERS ?? 4));
const FROM = Math.max(1, Number(process.env.FROM ?? 1));
const TO = Math.min(151, Number(process.env.TO ?? 151));
const PER = (CLIP / 1000) * FPS;
if (!Number.isInteger(PER)) throw new Error(`FPS ${FPS} doesn't fit the ${CLIP} ms slots (picture and sound would drift)`);

function findFirefox() {
  const candidates = [
    process.env.FIREFOX,
    '/usr/bin/firefox',
    '/usr/local/bin/firefox',
    '/snap/bin/firefox',
    '/Applications/Firefox.app/Contents/MacOS/firefox',
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Firefox not found: set FIREFOX=/path/to/firefox');
  return found;
}

function ffmpegOk() {
  return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

async function openPreview(url, firefox, profile) {
  const browser = await puppeteer.launch({ browser: 'firefox', executablePath: firefox, headless: true, userDataDir: profile, args: ['--width=768', '--height=576'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 768, height: 576 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`${url}?demo=attacks&capture`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__fx, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  return { browser, page };
}

async function recordRange(url, firefox, tmp, worker, ids) {
  const { browser, page } = await openPreview(url, firefox, path.join(tmp, `profile-${worker}`));
  try {
    for (const id of ids) {
      await page.evaluate((k) => window.__fx.show(k), id - 1);
      for (let f = 0; f < PER; f++) {
        await page.evaluate((ms) => window.__fx.seek(ms), (f * 1000) / FPS);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const n = (id - FROM) * PER + f;
        await page.screenshot({ path: path.join(tmp, 'frames', `f${String(n).padStart(6, '0')}.png`) });
      }
      process.stdout.write(`  #${String(id).padStart(3, '0')} ✓\n`);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const firefox = findFirefox();
  if (!ffmpegOk()) throw new Error('ffmpeg not found on the PATH');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vozimon-attacks-'));
  fs.mkdirSync(path.join(tmp, 'frames'));
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5177, strictPort: false } });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5177/';
  try {
    const ids = Array.from({ length: TO - FROM + 1 }, (_, k) => FROM + k);
    console.log(`Recording ${ids.length} attacks at ${FPS} fps with ${WORKERS} browsers (${firefox})...`);
    const chunks = Array.from({ length: WORKERS }, (_, w) => ids.slice(Math.floor((w * ids.length) / WORKERS), Math.floor(((w + 1) * ids.length) / WORKERS)));
    await Promise.all(chunks.filter((c) => c.length).map((c, w) => recordRange(url, firefox, tmp, w, c)));

    console.log('Rendering the soundtrack...');
    const { browser, page } = await openPreview(url, firefox, path.join(tmp, 'profile-audio'));
    const wavUrl = await page.evaluate(() => window.__fx.audio());
    await browser.close();
    const wav = path.join(tmp, 'all.wav');
    fs.writeFileSync(wav, Buffer.from(wavUrl.split(',')[1], 'base64'));
    // the soundtrack covers all 151 slots: start it at the first recorded one
    const startSec = ((FROM - 1) * CLIP) / 1000;

    console.log('Encoding the video...');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const res = spawnSync(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'frames', 'f%06d.png'), '-ss', String(startSec), '-i', wav,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT],
      { stdio: 'inherit' },
    );
    if (res.status !== 0) throw new Error('ffmpeg failed');
    console.log(`Done: ${path.relative(ROOT, OUT)}`);
  } finally {
    await server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
