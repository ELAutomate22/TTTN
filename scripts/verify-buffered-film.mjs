import { chromium, firefox, webkit } from 'playwright-core';

const engine = process.argv[2] || 'chromium';
const browser = await ({ chromium, firefox, webkit }[engine]).launch(engine === 'chromium'
  ? { executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true }
  : { headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/tttn-earth-london-seek.mp4', async route => { await gate; await route.continue(); });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.locator('.film-loading').waitFor();
  await page.evaluate(() => scrollTo({ top: 1500, behavior: 'instant' }));
  if (await page.evaluate(() => scrollY) < 1400) throw new Error('Loading blocked page scroll');
  if (await page.locator('.film-video').getAttribute('src')) throw new Error('Scrubbing enabled before full download');
  release();
  try {
    await page.waitForFunction(() => document.querySelector('.film-video').readyState >= 2);
  } catch (error) {
    console.error(await page.evaluate(() => { const v = document.querySelector('.film-video'); return { source: v.src.slice(0, 5), ready: v.readyState, error: v.error?.message, h264: v.canPlayType('video/mp4; codecs="avc1.640028"') }; }));
    throw error;
  }
  const buffered = (await page.locator('.film-video').getAttribute('src')).startsWith('blob:');
  if (!buffered && engine !== 'webkit') throw new Error('Not using buffered media');
  if (buffered) await context.setOffline(true);
  const metrics = await page.evaluate(async () => {
    const video = document.querySelector('.film-video');
    const range = document.querySelector('.film-scroll').offsetHeight - innerHeight;
    const frames = [];
    let active = true;
    const record = (_, frame) => { frames.push(frame.mediaTime); if (active) video.requestVideoFrameCallback(record); };
    const recordSeek = () => frames.push(video.currentTime);
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(record);
    else video.addEventListener('seeked', recordSeek);
    for (const reverse of [false, true]) {
      const start = performance.now();
      await new Promise(resolve => {
        const tick = now => {
          const p = Math.min(1, (now - start) / 2000);
          scrollTo({ top: range * (reverse ? 1 - p : p), behavior: 'instant' });
          if (p < 1) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    active = false;
    video.removeEventListener('seeked', recordSeek);
    return { forward: frames.filter((v, i) => i && v > frames[i - 1]).length, reverse: frames.filter((v, i) => i && v < frames[i - 1]).length, finalTime: video.currentTime, width: video.videoWidth };
  });
  if (metrics.forward < 15 || metrics.reverse < 15 || metrics.finalTime > .1 || metrics.width !== 1920) throw new Error(JSON.stringify(metrics));
  await context.setOffline(false);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.querySelector('.film-video'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.querySelector('.film-video')?.readyState >= 2);
  console.log(engine, 'PASS: slow download, forward/reverse scrubbing, reduced-motion toggle', { ...metrics, offline: buffered, nativeFallback: !buffered });
} finally { await browser.close(); }
