const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// The shared SiteHeader shows its links in the bar on wide screens and in the
// compact Menu sheet on narrow ones. Returns the navigation that is visible.
async function siteNavigation(page) {
  const primary = page.getByRole('navigation', { name: 'Primary', exact: true });
  if (await primary.isVisible()) return primary;
  await page.locator('.site-sheet > summary').click();
  return page.getByRole('navigation', { name: 'Menu', exact: true });
}

test('guides, examples, and homepage remain accessible and contained', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  for (const route of ['/', '/docs', '/docs/install', '/docs/html', '/docs/agents', '/docs/theming', '/docs/forms', '/docs/htmx', '/docs/accessibility', '/docs/deploy', '/examples']) {
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
  await (await siteNavigation(page)).getByRole('link', { name: 'Components' }).click();
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
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await (await siteNavigation(page)).getByRole('link', { name: 'Playground' }).click();
  await expect(page.locator('main')).toBeVisible();
  // First visit is dark everywhere; the shared toggle switches every surface.
  await page.getByRole('button', { name: 'Toggle theme' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('http://127.0.0.1:8080/docs');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await context.close();
});

test('1920px maximum, keyboard skip, and reduced motion', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'desktop') {
    for (const width of [320, 768, 1024, 1280, 1440, 1920, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `viewport ${width}`).toBe(true);
      const welcome = await page.locator('.mascot-welcome').boundingBox();
      const card = await page.locator('.sample-card').boundingBox();
      expect(welcome.x + welcome.width <= card.x + 1 || welcome.y + welcome.height <= card.y + 1, `preview content overlaps at ${width}`).toBe(true);
      if (width === 768 || width === 1440) {
        await page.screenshot({ path: testInfo.outputPath(`homepage-${width}.png`), fullPage: true, animations: 'disabled' });
      }
    }
    expect((await page.locator('.page').boundingBox()).width).toBe(1920);
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.hero-copy').evaluate(e => getComputedStyle(e).animationName)).toBe('none');
});


test('documentation uses TendUI with spaced navigation and responsive columns', async ({ page }, testInfo) => {
  // A cached copy of the old stable URL must not affect updated documentation.
  await page.route('**/site.css', route => route.fulfill({ contentType: 'text/css', body: 'body { background: red; }' }));
  await page.goto('/docs');
  await expect(page.locator('.app-shell')).toHaveCount(1);
  await expect(page.locator('main > .prose')).toHaveCount(1);
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
  expect(styles).toHaveLength(3);
  for (const href of styles) expect(href).toMatch(/^\/assets\/(tendui|header|docs)-[a-f0-9]{64}\.css$/);
  expect(await page.locator('.app-shell').evaluate(e => getComputedStyle(e).display)).toBe('grid');
  expect(await page.locator('h1').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeLessThanOrEqual(70);
  const header = await page.locator('.site-header').boundingBox();
  const main = await page.locator('main').boundingBox();
  expect(main.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  if (testInfo.project.name === 'desktop') {
    const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
    for (const link of await nav.getByRole('link').all()) {
      expect(await link.evaluate(e => parseFloat(getComputedStyle(e).paddingInlineStart))).toBeGreaterThanOrEqual(8);
    }
    await expect(nav.getByRole('link', { name: 'Docs' })).toHaveAttribute('aria-current', 'page');
    const sidebar = await page.locator('.app-sidebar').boundingBox();
    expect(sidebar.x + sidebar.width).toBeLessThanOrEqual(main.x + 1);
    expect(Math.abs(sidebar.y - main.y)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 2560, height: 1440 });
    expect((await page.locator('.app-shell').boundingBox()).width).toBe(1920);
  } else {
    // The guides move into the compact menu; the first heading sits under the bar.
    await expect(page.locator('.app-sidebar')).toBeHidden();
    expect(main.y - header.y).toBeLessThanOrEqual(header.height + 1);
    const menu = await siteNavigation(page);
    await expect(menu.getByRole('link', { name: 'Installation' })).toBeVisible();
  }
});


test('brand artwork, grouped demo menu, scenarios and example headings', async ({ page }, testInfo) => {
  for (const route of ['/', '/docs', '/examples', '/catalog', '/playground?theme=light']) {
    await page.goto(route);
    for (const img of await page.locator('img').all()) {
      // The decorative sidebar footer is intentionally hidden on small screens.
      if (!(await img.isVisible())) continue;
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate(e => e.complete && e.naturalWidth > 0)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
    if (route === '/examples') {
      await expect(page.locator('.example-directory h3 a')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Try a complete workflow' })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('examples.png'), fullPage: true, animations: 'disabled' });
    }
  }
  await page.screenshot({ path: testInfo.outputPath('playground.png'), fullPage: true, animations: 'disabled' });
  const nav = await siteNavigation(page);
  await nav.locator('summary', { hasText: 'Examples' }).click();
  await expect(page.getByRole('link', { name: 'Form wizard', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Form wizard', exact: true }).click();
  await expect(page).toHaveURL(/\/wizard$/);
  await page.goto('/playground');
  await page.getByRole('navigation', { name: 'Try a scenario' }).getByRole('link', { name: 'Disabled controls' }).click();
  await expect(page.getByLabel('Example text field', { exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: /^Control state/ }).selectOption('normal');
  await page.getByRole('button', { name: 'Apply and preview' }).click();
  await expect(page.getByLabel('Example text field', { exact: true })).toBeEnabled();
});

test('one header on every surface', async ({ page }, testInfo) => {
  let reference;
  for (const route of ['/', '/docs', '/docs/install', '/catalog', '/catalog/button', '/examples', '/dashboard', '/playground']) {
    await page.goto(route);
    await expect(page.locator('header.site-header')).toHaveCount(1);
    await expect(page.locator('.app-header, .masthead, .demo-header')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const box = await page.locator('.site-header').boundingBox();
    const brand = await page.locator('.site-brand').boundingBox();
    const geometry = { top: box.y, height: Math.round(box.height), brandX: Math.round(brand.x), brandY: Math.round(brand.y) };
    if (!reference) reference = geometry;
    expect(geometry, route).toEqual(reference);
    const marked = page.locator('.site-nav > [aria-current="page"], .site-nav > .site-menu > summary[data-current]');
    if (testInfo.project.name === 'desktop') await expect(marked).toHaveCount(route === '/' ? 0 : 1);
    // Native disclosure markers must not show in the header.
    for (const summary of await page.locator('.site-header summary').all()) {
      expect(await summary.evaluate(e => getComputedStyle(e).listStyleType)).toBe('none');
    }
  }
});


test('brand icons load on every surface and the taller mascot fits the header', async ({ page, request }) => {
  for (const route of ['/', '/docs', '/catalog', '/playground']) {
    await page.goto(route);
    const icons = page.locator('link[rel="icon"]');
    await expect(icons).toHaveCount(3);
    for (const href of await icons.evaluateAll(nodes => nodes.map(n => n.href))) {
      const response = await request.get(href);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/^image\//);
    }
    const logo = page.locator('.site-brand > img');
    expect(await logo.evaluate(e => e.complete && e.naturalWidth > 0)).toBe(true);
    const box = await logo.boundingBox();
    const header = await page.locator('.site-header').boundingBox();
    const rootSize = await page.locator('html').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
    expect(box.height).toBeCloseTo(rootSize * 2.5, 0);
    expect(box.y).toBeGreaterThanOrEqual(header.y);
    expect(box.y + box.height).toBeLessThanOrEqual(header.y + header.height);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  }
});


test('HTML onboarding downloads match the working example', async ({ browser, request }) => {
  const guide = await request.get('/docs/html');
  expect(guide.status()).toBe(200);
  expect(await guide.text()).toContain('v2026.2.0-preview.2');
  const css = await request.get('/quickstart/tendui.css');
  expect(css.status()).toBe(200);
  expect(await css.text()).toContain('--tendui-primary');
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8080/quickstart/index.html');
  await expect(page.getByRole('heading', { name: 'Hello, semantic HTML.' })).toBeVisible();
  await page.getByText('Does this work without JavaScript?', { exact: true }).click();
  await expect(page.getByText('Yes. The browser opens this disclosure using native HTML.')).toBeVisible();
  await expect(page.locator('script')).toHaveCount(0);
  await context.close();
});
