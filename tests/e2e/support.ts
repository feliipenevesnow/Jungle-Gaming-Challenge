import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, providePage) => {
    await page.clock.install({ time: new Date('2026-10-16T12:00:00Z') })
    page.on('pageerror', error => { throw error })
    await page.goto('/')
    await expect(page.locator('.nft-card').first()).toBeVisible()
    await api(page, 'POST', '/reset')
    await page.reload()
    await expect(page.locator('.nft-card').first()).toBeVisible()
    await providePage(page)
  },
})
export { expect }
export async function api<T = Record<string, unknown>>(page: Page, method: string, path: string, body?: unknown, auth: string | null | undefined = undefined, extraHeaders: Record<string, string> = {}): Promise<{ status: number; data: T }> {
  // A hard navigation may finish its load event before dynamic bootstrap. The
  // app shell is mounted only after worker.start(), including on every refresh.
  await page.locator('.app-shell').waitFor({ state: 'attached' })
  return page.evaluate(async ({ method, path, body, auth, extraHeaders }) => {
    const token = auth === undefined ? localStorage.getItem('kurio_session_token') : auth
    const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    const raw = await response.text()
    if (!raw) throw new Error(`${method} ${path}: HTTP ${response.status}, resposta vazia`)
    return { status: response.status, data: JSON.parse(raw) }
  }, { method, path, body, auth, extraHeaders })
}
export async function login(page: Page, address = 'alex@kurio.art', password = 'kurio123') {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(address)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByRole('dialog')).toBeHidden()
}
export async function scenario(page: Page, value: string) { await api(page, 'POST', '/scenario', { scenario: value }) }
export async function event(page: Page, body: Record<string, unknown>) {
  if (['nft.updated', 'order.replay', 'socket.disconnect'].includes(String(body.type))) {
    await expect.poll(async () => (await api<{ socketReady: boolean }>(page, 'GET', '/scenario')).data.socketReady).toBe(true)
  }
  return api(page, 'POST', '/scenario/events', body)
}
