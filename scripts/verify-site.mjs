import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.locator('.film-video').waitFor();
  await page.waitForFunction(() => document.querySelector('.film-video')?.readyState >= 1);
  const atStart = await page.locator('.film-video').evaluate(video => video.currentTime);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.4));
  await page.waitForTimeout(700);
  const atMiddle = await page.locator('.film-video').evaluate(video => video.currentTime);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.5));
  await page.waitForTimeout(700);
  const atEnd = await page.locator('.film-video').evaluate(video => video.currentTime);
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * .4));
  await page.waitForTimeout(700);
  const backUp = await page.locator('.film-video').evaluate(video => video.currentTime);
  if (!(atMiddle > atStart + 1 && atEnd > atMiddle + 1 && backUp < atMiddle)) throw new Error(`Scrub failed: ${[atStart, atMiddle, atEnd, backUp].join(', ')}`);
  await page.screenshot({ path: 'research/site-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Quiz Time' }).click();
  if (await page.locator('.video-card').count() !== 3) throw new Error('Watch category filter failed');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search videos' }).fill('synonyms');
  if (await page.locator('.video-card').count() !== 1) throw new Error('Watch search failed');
  await page.getByRole('searchbox', { name: 'Search videos' }).fill('');
  await page.getByRole('button', { name: /Start the quiz/ }).click();
  for (let i = 0; i < 5; i++) {
    await page.locator('.answers button').first().click();
    await page.getByRole('button', { name: i === 4 ? /See results/ : /Next question/ }).click();
  }
  if (!(await page.getByText('THE RESULTS ARE IN').isVisible())) throw new Error('Quiz result failed');
  await page.getByRole('button', { name: 'Cardiff' }).click();
  if (!(await page.locator('.place-copy h3').getByText('Cardiff').isVisible())) throw new Error('Location selector failed');
  await page.getByRole('tab', { name: 'I have a question' }).click();
  if (!(await page.getByPlaceholder('Share your question, guest, or location idea.').isVisible())) throw new Error('Contact tab failed');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ desktop: 'passed', scrubSeconds: [atStart, atMiddle, atEnd, backUp].map(value => +value.toFixed(2)) }));

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await mobile.getByRole('button', { name: /Menu/ }).click();
  if (!(await mobile.getByRole('link', { name: 'Watch', exact: true }).first().isVisible())) throw new Error('Mobile menu failed');
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`Mobile horizontal overflow: ${overflow}px`);
  await mobile.screenshot({ path: 'research/site-mobile.png', fullPage: true });
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({ mobile: 'passed', horizontalOverflow: overflow }));
} finally { await browser.close(); }
