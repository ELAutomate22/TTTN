import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.film-video')?.readyState >= 2);
  const result = await page.evaluate(async () => {
    const video = document.querySelector('.film-video');
    const range = document.querySelector('.film-scroll').offsetHeight - innerHeight;
    const decoded = [];
    let active = true;
    const record = (now, metadata) => {
      decoded.push({ now, time: metadata.mediaTime });
      if (active) video.requestVideoFrameCallback(record);
    };
    video.requestVideoFrameCallback(record);
    for (const reverse of [false, true]) {
      const start = performance.now();
      await new Promise(resolve => {
        const tick = now => {
          const progress = Math.min(1, (now - start) / 3000);
          scrollTo({ top: range * (reverse ? 1 - progress : progress), behavior: 'instant' });
          if (progress < 1) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    active = false;
    return { decodedFrames: decoded.length, forwardFrames: decoded.filter((frame, i) => i && frame.time > decoded[i - 1].time).length, reverseFrames: decoded.filter((frame, i) => i && frame.time < decoded[i - 1].time).length, finalTime: video.currentTime, width: video.videoWidth, height: video.videoHeight };
  });
  if (result.forwardFrames < 30 || result.reverseFrames < 30 || result.finalTime > .1) throw new Error(JSON.stringify(result));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
