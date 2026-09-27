import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let failVideo = true;
  await page.route('**/tttn-earth-london-seek.mp4', route => failVideo ? route.abort() : route.continue());
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('.film-video')?.error);
  if (!(await page.locator('.film-poster').isVisible())) throw new Error('Missing fallback');
  failVideo = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForFunction(() => {
    const video = document.querySelector('.film-video');
    return video.readyState >= 2 && !video.classList.contains('is-unavailable');
  });
  await page.evaluate(() => scrollTo({ top: innerHeight * 1.4, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.film-video').currentTime > 4);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('pageshow'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => {
    const video = document.querySelector('.film-video');
    return video.readyState >= 2 && !video.seeking && video.currentTime > 4;
  });
  console.log('Passed: failed media fallback, automatic recovery, scroll restoration, page/tab resume.');
} finally { await browser.close(); }
