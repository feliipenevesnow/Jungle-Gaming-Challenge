import { test, expect, api, login, scenario, event } from './support'
import type { Order, Wallet, User, CreateOrderPayload } from '../../src/types/api'

async function orderPayload(page: Parameters<typeof login>[0]): Promise<CreateOrderPayload> {
  const wallet = (await api<Wallet[]>(page, 'GET', '/wallets')).data[0]
  const profile = (await api<User>(page, 'GET', '/profile')).data
  await api(page, 'POST', `/wallets/${wallet.id}/connect`, { provider: 'MetaMask' })
  return { items: [{ nftId: 'nft-1', edition: '1/50', quantity: 1 }], walletAddress: wallet.address, network: wallet.network, collector: { displayName: profile.name, username: profile.username, profileName: profile.name, referralCode: 'KURIO-2026', ensName: 'colecionador', walletType: 'MetaMask', email: profile.email } }
}

test('pedido e recibo exigem sessão e proprietário; chave idempotente não cria outra compra', async ({ page }) => {
  await login(page)
  const payload = await orderPayload(page)
  const header = { 'Idempotency-Key': 'isolated-order' }
  const created = await api<Order>(page, 'POST', '/orders', payload, undefined, header)
  expect(created.status).toBe(202)
  const again = await api<Order>(page, 'POST', '/orders', payload, undefined, header)
  expect(again.data.id).toBe(created.data.id)
  expect((await api(page, 'POST', '/orders', { ...payload, note: 'alterada' }, undefined, header)).status).toBe(409)
  expect((await api(page, 'GET', `/orders/${created.data.id}`, undefined, null)).status).toBe(401)
  await expect.poll(async () => (await api<Order>(page, 'GET', `/orders/${created.data.id}`)).data.status).toBe('CONFIRMED')
  const oldToken = await page.evaluate(() => localStorage.getItem('kurio_session_token'))
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  expect((await api(page, 'GET', '/auth/me', undefined, oldToken)).status).toBe(401)
  await login(page, 'sofia@kurio.art')
  expect((await api(page, 'GET', `/orders/${created.data.id}`)).status).toBe(404)
  expect((await api(page, 'GET', `/orders/${created.data.id}/receipt`)).status).toBe(404)
  await page.goto(`/orders/${created.data.id}`)
  await expect(page.getByRole('heading', { name: 'Pedido Não Encontrado' })).toBeVisible()
  await expect(page.locator('.order-receipt')).toHaveCount(0)
})

test('sessão expirada no checkout mantém o contexto para novo login', async ({ page }) => {
  await login(page)
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  await event(page, { type: 'session.expire' })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('E-mail', { exact: true }).fill('alex@kurio.art')
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
})

test('evento Socket.IO atualiza carrinho e checkout exige nova confirmação; versões antigas são descartadas', async ({ page }) => {
  await login(page)
  await page.goto('/cart')
  await expect(page.locator('.cart-totals')).toContainText('26.846 ETH')
  await event(page, { type: 'nft.updated', id: 'nft-1', priceEth: '2.19' })
  await expect(page.locator('.cart-totals')).toContainText('28.846 ETH')
  await expect(page.locator('.cart-row').first()).toContainText('2.19 ETH')
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  await event(page, { type: 'nft.updated', id: 'nft-1', priceEth: '3.19' })
  await expect(page.getByRole('alert').first()).toContainText('Preço ou disponibilidade atualizado')
  await event(page, { type: 'nft.updated', id: 'nft-1', priceEth: '99.00', replay: true, version: 1 })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('alert').first()).toContainText('confirme novamente')
  expect((await api<Order[]>(page, 'GET', '/orders')).data).toHaveLength(0)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(page.locator('.order-receipt')).toContainText('30.846 ETH')
  const id = page.url().split('/').at(-1)!
  await event(page, { type: 'order.replay', id, version: 1 })
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
})

test('pedido pendente recupera após refresh e reconexão, sem duplicação', async ({ page }) => {
  await login(page)
  await scenario(page, 'order-pending')
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Processando seu pedido' })).toBeVisible()
  const orderURL = page.url()
  await event(page, { type: 'socket.disconnect', durationMs: 900 })
  await page.reload()
  await expect(page).toHaveURL(orderURL)
  await page.clock.fastForward(6000)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 10000 })
  expect((await api<Order[]>(page, 'GET', '/orders')).data).toHaveLength(1)
})

test('timeout depois da criação recupera a mesma tentativa após refresh', async ({ page }) => {
  await login(page)
  await scenario(page, 'timeout-idempotent')
  await page.goto('/checkout')
  await event(page, { type: 'socket.disconnect', durationMs: 1000 })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect.poll(async () => (await api<Order[]>(page, 'GET', '/orders')).data.length).toBe(1)
  await page.clock.fastForward(10001)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  const recoveredURL = page.url()
  await page.reload()
  await expect(page).toHaveURL(recoveredURL)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 12000 })
  expect((await api<Order[]>(page, 'GET', '/orders')).data).toHaveLength(1)
})

test('recusa de conexão informa falha e não cria pedido; permite tentar novamente', async ({ page }) => {
  await login(page)
  await scenario(page, 'wallet-rejected')
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('alert')).toContainText('Conexão recusada')
  expect((await api<Order[]>(page, 'GET', '/orders')).data).toHaveLength(0)
  await scenario(page, 'default')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
})
