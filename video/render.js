// Renders video/promo.html frame-by-frame into an MP4 (with the synthesized soundtrack).
// Needs: puppeteer-core + ffmpeg-static (npm i puppeteer-core ffmpeg-static), Chrome installed,
// and the site served at BASE (e.g. any static server on the repo root).
// Usage:
//   node render.js stills <outDir> [meals]          -> key-frame PNGs for review
//   node render.js video  <out.mp4> <music.wav> [meals]
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');
const ffmpeg = require(process.env.FFMPEG || 'ffmpeg-static');

const BASE = process.env.BASE || 'http://localhost:5173';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FPS = +(process.env.FPS || 30);
const [mode, outArg, a3, a4] = process.argv.slice(2);

(async () => {
  const meals = mode === 'video' ? a4 : a3;
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--disable-gpu-vsync', '--font-render-hinting=none']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await page.goto(`${BASE}/video/promo.html${meals ? '?meals=' + meals : ''}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  const duration = await page.evaluate('window.__duration');

  if (mode === 'stills') {
    const fs = require('fs'); fs.mkdirSync(outArg, { recursive: true });
    const times = [1.6, 3.7, 5.4, 7.3, 9.6, 12.8, 14.9, 16.4, 19.2, 23.8, 25.2, 27.4, 29.0, 31.0, 33.2, 37.0];
    for (const t of times) {
      await page.evaluate(t => window.__seek(t), t);
      await page.screenshot({ path: path.join(outArg, `t${String(t.toFixed(1)).padStart(4, '0')}.png`) });
    }
    console.log('stills ->', outArg);
  } else {
    const music = a3;
    const ff = spawn(ffmpeg, [
      '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-i', music,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', outArg
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const frames = Math.round(duration * FPS);
    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      await page.evaluate(t => window.__seek(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95, optimizeForSpeed: true });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('video ->', outArg);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
