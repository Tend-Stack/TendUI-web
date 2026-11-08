const { test, expect } = require('@playwright/test');
const { mkdir } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const path = require('node:path');

async function waitForVisibleAssets(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visibleImages = Array.from(document.images).filter(image => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
        rect.top < innerHeight && rect.left < innerWidth;
    });
    await Promise.all(visibleImages.map(image => image.decode()));
  });
}

const pages = [
  ['home', '/'],
  ['docs', '/docs'],
  ['catalog', '/catalog'],
  ['playground', '/playground'],
];

for (const theme of ['light', 'dark']) {
  for (const [name, route] of pages) {
    test(`${name} ${theme}`, async ({ page, context }, testInfo) => {
      await context.addCookies([{ name: 'tendui_theme', value: theme, url: 'http://127.0.0.1:8080' }]);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      const response = await page.goto(route);
      expect(response.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
      await waitForVisibleAssets(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

      // Candidate captures are evidence only. CI never writes approved baselines.
      const directory = path.resolve(__dirname, '../results/visual/candidates', testInfo.project.name);
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: path.join(directory, `${name}-${theme}.png`), animations: 'disabled', caret: 'hide', scale: 'css' });
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`);
    });
  }
}

test('comparison rejects a missing heading', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One desktop negative control is sufficient.');
  test.skip(!existsSync(testInfo.snapshotPath('home-light.png')), 'Requires the reviewed initial baseline.');
  await context.addCookies([{ name: 'tendui_theme', value: 'light', url: 'http://127.0.0.1:8080' }]);
  await page.goto('/');
  await waitForVisibleAssets(page);
  await expect(page).toHaveScreenshot('home-light.png');
  await page.locator('h1').evaluate(heading => { heading.style.visibility = 'hidden'; });
  let failure = '';
  try {
    await expect(page).toHaveScreenshot('home-light.png', { timeout: 1000 });
  } catch (error) {
    failure = error.message;
  }
  // Accept only an actual image difference, never a browser or network failure.
  expect(failure).toMatch(/\d+ pixels.*different/s);
});
