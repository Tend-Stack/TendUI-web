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
  await page.screenshot({ path: testInfo.outputPath('homepage.png'), fullPage: true, animations: 'disabled' });
  await page.goto('/docs');
  await page.screenshot({ path: testInfo.outputPath('documentation.png'), fullPage: true, animations: 'disabled' });
  await page.goto('/docs/install');
  await page.screenshot({ path: testInfo.outputPath('installation.png'), fullPage: true, animations: 'disabled' });
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


test('documentation uses GothUI with spaced navigation and responsive columns', async ({ page }, testInfo) => {
  // A cached copy of the old stable URL must not affect updated documentation.
  await page.route('**/site.css', route => route.fulfill({ contentType: 'text/css', body: 'body { background: red; }' }));
  await page.goto('/docs');
  await expect(page.locator('.app-shell')).toHaveCount(1);
  await expect(page.locator('main > .prose')).toHaveCount(1);
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  expect(styles).toHaveLength(2);
  for (const href of styles) expect(href).toMatch(/^\/assets\/(gothui|docs)-[a-f0-9]{64}\.css$/);
  expect(await page.locator('.app-shell').evaluate(e => getComputedStyle(e).display)).toBe('grid');
  const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
  expect(await nav.evaluate(e => parseFloat(getComputedStyle(e).columnGap))).toBeGreaterThanOrEqual(16);
  expect(await page.locator('h1').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeLessThanOrEqual(70);
  const sidebar = await page.locator('.app-sidebar').boundingBox();
  const main = await page.locator('main').boundingBox();
  if (testInfo.project.name === 'desktop') {
    expect(sidebar.x + sidebar.width).toBeLessThanOrEqual(main.x + 1);
    expect(Math.abs(sidebar.y - main.y)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 2560, height: 1440 });
    expect((await page.locator('.app-shell').boundingBox()).width).toBe(1920);
  } else {
    expect(main.y).toBeGreaterThanOrEqual(sidebar.y + sidebar.height - 1);
    await page.getByText('Navigation', { exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Application', exact: true })).toBeHidden();
  }
});
