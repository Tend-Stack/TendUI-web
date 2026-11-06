const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('guides, examples, and homepage remain accessible and contained', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  for (const route of ['/', '/docs', '/docs/install', '/docs/theming', '/docs/forms', '/docs/htmx', '/docs/accessibility', '/docs/deploy', '/examples']) {
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('script')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
    // Contrast is measured after the finite entrance animation completes.
    await page.locator('main').evaluate(async root => {
      await Promise.all(root.getAnimations({ subtree: true }).filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
    });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect.soft(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), route).toEqual([]);
  }
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('homepage.png'), fullPage: true });
  await page.goto('/docs/install');
  await page.screenshot({ path: testInfo.outputPath('installation.png'), fullPage: true });
});

test('landing page leads to documentation and the real catalog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Start building' }).click();
  await expect(page).toHaveURL(/\/docs\/install$/);
  await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: 'Components' }).click();
  await page.getByRole('searchbox', { name: 'Search components' }).fill('Button');
  await page.getByRole('button', { name: 'Find components' }).click();
  await page.getByRole('heading', { name: 'Button', exact: true }).getByRole('link').click();
  await expect(page.getByRole('heading', { name: 'Templ example' })).toBeVisible();
});

test('native site and demo workflows work with scripts disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8080/');
  await page.getByText('Simple by nature', { exact: false }).click();
  await expect(page.getByText('This disclosure is native HTML.', { exact: false })).toBeVisible();
  await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: 'Playground' }).click();
  await expect(page.locator('main')).toBeVisible();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await context.close();
});

test('1920px maximum, keyboard skip, and reduced motion', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 2560, height: 1440 });
    expect((await page.locator('.page').boundingBox()).width).toBe(1920);
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.hero-copy').evaluate(e => getComputedStyle(e).animationName)).toBe('none');
});
