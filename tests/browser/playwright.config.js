const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.', testMatch: '*.spec.js',
  outputDir: '../results/browser/artifacts',
  reporter: [['line'], ['json', { outputFile: '../results/browser/results.json' }]],
  timeout: 60000, retries: 0, workers: 2,
  use: { baseURL: 'http://127.0.0.1:8080', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } },
    { name: 'mobile', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: '../results/browser/site', url: 'http://127.0.0.1:8080/healthz', reuseExistingServer: false },
});
