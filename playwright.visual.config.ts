import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'figma-layout.spec.ts',
  timeout: 45_000,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'artifacts/visual-report', open: 'never' }]],
  outputDir: 'artifacts/visual-results',
  snapshotPathTemplate: '{testDir}/visual-baselines/{projectName}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.005 } },
  use: { baseURL: 'http://127.0.0.1:5174', deviceScaleFactor: 1, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'figma-mobile-414', use: { viewport: { width: 414, height: 896 }, isMobile: true, hasTouch: true } },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5174', url: 'http://127.0.0.1:5174', reuseExistingServer: true },
})
