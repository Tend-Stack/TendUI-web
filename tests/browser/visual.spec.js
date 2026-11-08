const { test, expect } = require('@playwright/test');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');

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
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, image => image.decode()));
      });
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
