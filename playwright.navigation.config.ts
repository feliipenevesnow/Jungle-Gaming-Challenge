import { defineConfig } from '@playwright/test'
import visual from './playwright.visual.config'

export default defineConfig(visual, {
  testMatch: 'navigation-actions.spec.ts',
  outputDir: 'artifacts/navigation-results',
  reporter: [['list'], ['html', { outputFolder: 'artifacts/navigation-report', open: 'never' }]],
})
