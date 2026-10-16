// Independent network contract checks; every probe uses an isolated MSW browser.
import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5174'
const browser = await chromium.launch()
const results = []
await mkdir('artifacts/audit', { recursive: true })
async function probe(name, check) {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    await page.goto(base)
    await page.locator('.nft-card').first().waitFor()
    const request = (method, path, body, token, extraHeaders = {}) => page.evaluate(async args => {
      const start = performance.now()
      const response = await fetch(`/api${args.path}`, { method: args.method, headers: { 'Content-Type': 'application/json', ...(args.token ? { Authorization: `Bearer ${args.token}` } : {}), ...args.extraHeaders }, ...(args.body === undefined ? {} : { body: JSON.stringify(args.body) }) })
      return { status: response.status, data: await response.json(), elapsedMs: Math.round(performance.now() - start) }
    }, { method, path, body, token, extraHeaders })
    await request('POST', '/reset')
    const login = async (email = 'alex@kurio.art') => (await request('POST', '/auth/login', { email, password: 'kurio123' })).data.token
    results.push({ name, passed: true, evidence: await check({ page, request, login }) })
  } catch (error) { results.push({ name, passed: false, error: error.message }) }
  finally { await context.close() }
  console.log(JSON.stringify(results.at(-1)))
}
try {
  await probe('precisao-do-desconto-e-wei', async ({ request }) => {
    const payload = { items: [{ nftId: 'nft-1', edition: '1/50', quantity: 1 }], network: 'Ethereum', couponCode: 'KURIO10' }
    const normal = await request('POST', '/cart/quote', payload)
    assert.equal(normal.data.discountEth, '0.119'); assert.equal(normal.data.totalEth, '1.087')
    await request('POST', '/scenario/events', { type: 'nft.updated', id: 'nft-1', priceEth: '0.000000000000000019' })
    const tiny = await request('POST', '/cart/quote', payload)
    assert.equal(tiny.data.discountEth, '0.000000000000000001'); assert.equal(tiny.data.totalEth, '0.016000000000000018')
    return { total: normal.data.totalEth, discountWei: tiny.data.discountEth, totalWithWei: tiny.data.totalEth }
  })
  await probe('validacao-de-quantidade-edicao-e-cadastro', async ({ request }) => {
    const excess = await request('PATCH', '/cart/items/cart-item-1', { quantity: 999 })
    const fraction = await request('PATCH', '/cart/items/cart-item-1', { quantity: 1.5 })
    const edition = await request('POST', '/cart/items', { nftId: 'nft-1', edition: 'INVALIDA', quantity: 1 })
    const account = await request('POST', '/auth/register', { name: '   ', email: 'invalido', password: 'x' })
    assert.equal(excess.status, 409); assert.equal(fraction.status, 400); assert.equal(edition.status, 400); assert.equal(account.status, 400)
    return { excess: excess.status, fraction: fraction.status, edition: edition.status, account: account.status }
  })
  await probe('pedido-privado-idempotente-e-snapshot', async ({ request, login }) => {
    const token = await login()
    const wallet = (await request('GET', '/wallets', undefined, token)).data[0]
    await request('POST', `/wallets/${wallet.id}/connect`, { provider: 'MetaMask' }, token)
    const payload = { items: [{ nftId: 'nft-1', edition: '1/50', quantity: 1 }], network: wallet.network, walletAddress: wallet.address, collector: { displayName: 'Alex Vance', username: '@alex_collector', profileName: 'Alex', referralCode: 'KURIO-2026', ensName: 'alex.eth', email: 'alex@kurio.art', walletType: 'MetaMask' } }
    const headers = { 'Idempotency-Key': 'audit-unique-order' }
    const created = await request('POST', '/orders', payload, token, headers)
    assert.equal(created.status, 202); assert.equal(created.data.status, 'PENDING')
    const again = await request('POST', '/orders', payload, token, headers)
    assert.equal(again.data.id, created.data.id)
    assert.equal((await request('POST', '/orders', { ...payload, note: 'changed' }, token, headers)).status, 409)
    const sofia = await login('sofia@kurio.art')
    for (const suffix of ['', '/receipt']) {
      assert.equal((await request('GET', `/orders/${created.data.id}${suffix}`)).status, 401)
      assert.equal((await request('GET', `/orders/${created.data.id}${suffix}`, undefined, sofia)).status, 404)
    }
    await expect.poll(async () => (await request('GET', `/orders/${created.data.id}`, undefined, token)).data.status).toBe('CONFIRMED')
    await request('POST', '/scenario/events', { type: 'nft.updated', id: 'nft-1', priceEth: '99.00' })
    const order = (await request('GET', `/orders/${created.data.id}`, undefined, token)).data
    assert.equal(order.totalEth, '1.206'); assert.equal(order.items[0].unitPriceEth, '1.19')
    assert.equal((await request('GET', '/orders', undefined, token)).data.length, 1)
    return { initial: created.data.status, final: order.status, totalSnapshot: order.totalEth, duplicate: false, guest: 401, foreign: 404 }
  })
  await probe('perfil-atomico-carteiras-e-revogacao', async ({ request, login }) => {
    const token = await login()
    const invalid = await request('PATCH', '/profile', { name: 'Nao deve salvar', currentPassword: 'errada', newPassword: 'nova1234' }, token)
    assert.equal(invalid.status, 400)
    assert.equal((await request('GET', '/profile', undefined, token)).data.name, 'Alex Vance')
    const saved = await request('PATCH', '/profile', { username: '@auditoria', ensName: 'novo.eth', walletNickname: 'Nova' }, token)
    assert.equal(saved.data.username, '@auditoria'); assert.equal(saved.data.ensName, 'novo.eth')
    assert.equal((await request('POST', '/wallets', { address: 'abc', network: 'Ethereum', label: 'Invalida' }, token)).status, 400)
    await request('POST', '/auth/logout', undefined, token)
    assert.equal((await request('GET', '/auth/me', undefined, token)).status, 401)
    assert.equal((await request('GET', '/auth/me', undefined, 'token-user-alex')).status, 401)
    return { atomic: true, persistedUsername: saved.data.username, invalidWallet: 400, revokedToken: 401, forgedToken: 401 }
  })
  await probe('cenarios-documentados-e-expiracao', async ({ page, request, login }) => {
    const token = await login()
    assert.equal((await request('GET', '/auth/me', undefined, token, { 'x-msw-scenario': 'network-error' })).status, 500)
    const slow = await request('GET', '/auth/me', undefined, token, { 'x-msw-scenario': 'slow-network' })
    assert.equal(slow.status, 200); assert.ok(slow.elapsedMs >= 1400)
    await page.clock.setFixedTime(new Date(Date.now() + 48 * 60 * 60 * 1000))
    assert.equal((await request('GET', '/auth/me', undefined, token)).status, 401)
    return { httpError: 500, latencyMs: slow.elapsedMs, expired: 401 }
  })
} finally {
  await browser.close()
  await writeFile('artifacts/audit/probes-current.json', JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2))
}
if (results.some(result => !result.passed)) process.exitCode = 1
