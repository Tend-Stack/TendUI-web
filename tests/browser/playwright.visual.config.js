const { defineConfig } = require('@playwright/test');

// Canonical captures run on the Ubuntu 24.04 CI runner with the locked browser.
// Other platforms can help inspect changes but must not replace these baselines.
module.exports = defineConfig({
  testDir: '.',
  testMatch: 'visual.spec.js',
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}',
  updateSnapshots: 'none',
  outputDir: '../results/visual/artifacts',
  reporter: [['line'], ['json', { outputFile: '../results/visual/results.json' }]],
  timeout: 30000,
  retries: 0,
  workers: 1,
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      threshold: 0.1,
      maxDiffPixels: 100,
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:8080',
    browserName: 'chromium',
    locale: 'en-US',
    timezoneId: 'UTC',
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1920, height: 1080 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: '../results/browser/site',
    url: 'http://127.0.0.1:8080/healthz',
    reuseExistingServer: false,
  },
});
