import { chromium, expect } from '@playwright/test'
import { preview } from 'vite'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const server = await preview({ preview: { host: '127.0.0.1', port: 4176, strictPort: true } })
const browser = await chromium.launch()
const results = []
await mkdir('artifacts/audit', { recursive: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 })
    const page = await context.newPage()
    page.on('pageerror', error => { throw error })
    const api = (method, path, body) => page.evaluate(async args => {
      const token = localStorage.getItem('kurio_session_token')
      const response = await fetch(`/api${args.path}`, { method: args.method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(args.body === undefined ? {} : { body: JSON.stringify(args.body) }) })
      return { status: response.status, data: await response.json() }
    }, { method, path, body })
    try {
      await page.goto('http://127.0.0.1:4176/login')
      await expect(page.getByRole('dialog')).toBeVisible()
      const dialog = (await page.getByRole('dialog').boundingBox())
      expect(Math.abs(dialog.x + dialog.width / 2 - width / 2)).toBeLessThan(1)
      if (width >= 768) expect(Math.abs(dialog.y + dialog.height / 2 - 450)).toBeLessThan(1)
      expect(dialog.y).toBeGreaterThanOrEqual(0)
      expect(dialog.y + dialog.height).toBeLessThanOrEqual(901)
      await page.getByLabel('E-mail', { exact: true }).fill('alex@kurio.art')
      await page.getByLabel('Senha', { exact: true }).fill('kurio123')
      await page.locator('.auth-form button[type=submit]').click()
      await expect(page.getByRole('dialog')).toBeHidden()
      await page.goto('http://127.0.0.1:4176/checkout')
      const confirm = page.getByRole('button', { name: 'Confirmar compra', exact: true })
      await expect(confirm).toBeEnabled()
      await expect.poll(async () => (await api('GET', '/scenario')).data.socketReady).toBe(true)
      await api('POST', '/scenario/events', { type: 'nft.updated', id: 'nft-1', priceEth: '2.19' })
      await expect(page.getByRole('alert').first()).toContainText('Preço ou disponibilidade atualizado')
      await confirm.click()
      await expect(page.getByRole('alert').first()).toContainText('confirme novamente')
      await confirm.click()
      await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
      const orderURL = page.url()
      const orders = (await api('GET', '/orders')).data
      expect(orders).toHaveLength(1)
      expect(orders[0]).toMatchObject({ status: 'CONFIRMED', totalEth: '28.846' })
      await page.reload()
      await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
      await page.screenshot({ path: `artifacts/audit/production-${width}.png`, fullPage: true })
      await page.goto('http://127.0.0.1:4176/profile')
      const oldToken = await page.evaluate(() => localStorage.getItem('kurio_session_token'))
      const loggedOut = page.waitForResponse(response => response.url().endsWith('/api/auth/logout') && response.status() === 200)
      await page.getByRole('button', { name: 'Sair', exact: true }).click()
      await loggedOut
      await expect(page).toHaveURL(url => url.pathname === '/')
      expect(await page.evaluate(async token => (await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })).status, oldToken)).toBe(401)
      await page.goto(orderURL)
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.locator('.order-receipt')).toHaveCount(0)
      expect((await api('GET', `/orders/${orders[0].id}`)).status).toBe(401)
      results.push({ width, passed: true, modalPositionVerified: true, socketPriceUpdated: true, status: orders[0].status, totalEth: orders[0].totalEth, orders: orders.length, refreshRecovered: true, authGuard: true })
      console.log(JSON.stringify(results.at(-1)))
    } catch (error) {
      results.push({ width, passed: false, error: error.message })
      throw error
    } finally { await context.close() }
  }
} finally {
  await browser.close()
  await new Promise(resolve => server.httpServer.close(resolve))
  await writeFile('artifacts/audit/production-smoke.json', JSON.stringify({ htmlSha256: createHash('sha256').update(await readFile('dist/index.html')).digest('hex'), results }, null, 2))
}
