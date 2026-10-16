import { chromium } from 'playwright'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { preview } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { cpus, platform, release } from 'node:os'
import { createServer } from 'node:net'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import config from '../lighthouse.config.mjs'

const output = 'lighthouse-report'
await mkdir(output, { recursive: true })
const server = await preview({ preview: { host: '127.0.0.1', port: config.port, strictPort: true } })
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
// Playwright launches the installed browser reliably on Windows; Lighthouse uses
// its standard CDP connection. Every metric still comes from a real navigation.
let browser
const browserVersion = await chromium.launch()
const version = browserVersion.version()
await browserVersion.close()
const report = { timestamp: new Date().toISOString(), htmlSha256: createHash('sha256').update(await readFile('dist/index.html')).digest('hex'), conditions: 'Production preview, default MSW, cold browser per run, Lighthouse standard simulated throttling, no concurrent test suites', environment: { node: process.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, logicalCPUs: cpus().length, browser: version }, runs: [], medians: [] }
const repeats = process.argv.includes('--quick') ? 1 : config.runs
try {
  const profiles = process.argv.includes('--mobile-only') ? ['mobile'] : config.profiles
  const pages = process.argv.includes('--home-only') ? [['/', 'inicio']] : config.pages
  for (const profile of profiles) for (const [path, name] of pages) {
    const runs = []
    for (let run = 1; run <= repeats; run++) {
      // One fresh browser per measurement: no previous SW, cache or IndexedDB.
      browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`, '--incognito'] })
      const result = await lighthouse(`http://127.0.0.1:${config.port}${path}`, { port, hostname: '127.0.0.1', logLevel: 'error', output: ['html', 'json'] }, profile === 'desktop' ? desktopConfig : undefined)
      if (!result || result.lhr.runtimeError) throw new Error(result?.lhr.runtimeError?.message || 'Lighthouse nÃ£o produziu um resultado vÃ¡lido.')
      const prefix = `${output}/${profile}-${name}-${run}`
      await writeFile(`${prefix}.html`, result.report[0])
      await writeFile(`${prefix}.json`, result.report[1])
      const { lhr } = result
      const data = { profile, path, run, lighthouseVersion: lhr.lighthouseVersion, scores: Object.fromEntries(Object.entries(lhr.categories).map(([key, category]) => [key, Math.round(category.score * 100)])), lcpMs: lhr.audits['largest-contentful-paint'].numericValue, cls: lhr.audits['cumulative-layout-shift'].numericValue, tbtMs: lhr.audits['total-blocking-time'].numericValue, warnings: lhr.runWarnings }
      await browser?.close(); browser = undefined
      runs.push(data); report.runs.push(data)
      console.log(JSON.stringify(data))
    }
    const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]
    report.medians.push({ profile, path, measuredRuns: repeats, scores: Object.fromEntries(Object.keys(runs[0].scores).map(key => [key, median(runs.map(run => run.scores[key]))])), lcpMs: median(runs.map(run => run.lcpMs)), cls: median(runs.map(run => run.cls)), tbtMs: median(runs.map(run => run.tbtMs)) })
  }
} finally {
  await browser?.close()
  await new Promise(resolve => server.httpServer.close(resolve))
  await writeFile(`${output}/summary.json`, JSON.stringify(report, null, 2))
}
if (report.medians.some(result => Object.entries(config.budgets).some(([key, minimum]) => result.scores[key] < minimum))) process.exitCode = 1
