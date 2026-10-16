import { test, expect, api, login, scenario, event } from './support'
import type { CartState, CreateOrderPayload, NFT, Order, User, Wallet } from '../../src/types/api'

async function signInDialog(page: Parameters<typeof login>[0], email = 'alex@kurio.art') {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.locator('.auth-form')).toHaveCount(0)
}

async function payloadFor(page: Parameters<typeof login>[0], wallet: Wallet): Promise<CreateOrderPayload> {
  const user = (await api<User>(page, 'GET', '/profile')).data
  await api(page, 'POST', `/wallets/${wallet.id}/connect`, { provider: 'MetaMask' })
  return { items: [{ nftId: 'nft-1', edition: '1/50', quantity: 1 }], walletAddress: wallet.address, network: wallet.network, collector: { displayName: user.name, username: user.username, profileName: user.name, referralCode: 'KURIO-2026', ensName: 'coletor', walletType: 'MetaMask', email: user.email } }
}

test('estoque reduzido durante pedido pendente rejeita atomicamente a soma das edições', async ({ page }) => {
  await login(page)
  const wallet = (await api<Wallet[]>(page, 'GET', '/wallets')).data[0]
  const payload = await payloadFor(page, wallet)
  payload.items = [{ nftId: 'nft-1', edition: '1/50', quantity: 2 }, { nftId: 'nft-1', edition: '1/10', quantity: 2 }]
  const cartBefore = (await api<CartState>(page, 'GET', '/cart')).data.items
  await scenario(page, 'order-pending')
  const created = await api<Order>(page, 'POST', '/orders', payload, undefined, { 'Idempotency-Key': 'multiple-editions-recovery' })
  expect(created.status).toBe(202)
  await page.goto(`/orders/${created.data.id}`)
  await expect(page.getByRole('heading', { name: 'Processando seu pedido' })).toBeVisible()
  await event(page, { type: 'nft.updated', id: 'nft-1', availableQuantity: 3 })
  const editionStockBefore = (await api<NFT>(page, 'GET', '/nfts/nft-1')).data.editionStock
  await api(page, 'POST', '/scenario/events', { type: 'order.resolve', id: created.data.id })
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  expect((await api<NFT>(page, 'GET', '/nfts/nft-1')).data).toMatchObject({ availableQuantity: 3, editionStock: editionStockBefore })
  expect((await api<CartState>(page, 'GET', '/cart')).data.items.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity }))).toEqual(cartBefore.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity })))
  expect((await api(page, 'GET', `/orders/${created.data.id}/receipt`)).status).toBe(409)
  await page.clock.fastForward(6000)
  expect((await api<Order>(page, 'GET', `/orders/${created.data.id}`)).data.status).toBe('REJECTED')
})

test('mutation atrasada da conta anterior não encerra a nova sessão nem restaura seus favoritos', async ({ page }) => {
  await login(page)
  await page.goto('/favorites')
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(2)
  await scenario(page, 'slow-network')
  const request = page.waitForRequest(r => r.method() === 'DELETE' && r.url().endsWith('/favorites/nft-1'))
  const response = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().endsWith('/favorites/nft-1'))
  await page.getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' }).filter({ visible: true }).first().click()
  await request
  await scenario(page, 'default')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).filter({ visible: true }).first().click()
  await page.getByLabel('E-mail', { exact: true }).fill('sofia@kurio.art')
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.locator('.auth-form')).toHaveCount(0)
  const token = await page.evaluate(() => localStorage.getItem('kurio_session_token'))
  expect(token).toBeTruthy()
  expect((await response).status()).toBe(401)
  expect(await page.evaluate(() => localStorage.getItem('kurio_session_token'))).toBe(token)
  expect((await api<User>(page, 'GET', '/profile')).data.id).toBe('user-sofia')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/favorites')
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(1)
  await expect(page.locator('.favorites-page .nft-card')).toContainText('Sage Nomad')
})

test('checkout preserva rascunho e carteira após expiração e refresh, e limpa no logout', async ({ page }, info) => {
  await login(page)
  const wallet = (await api<Wallet[]>(page, 'GET', '/wallets')).data.find(item => item.network === 'Polygon')!
  await page.goto('/checkout')
  const mobile = info.project.name.includes('Mobile')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  if (mobile) await page.getByRole('button', { name: 'Revisar dados' }).click()
  await page.getByLabel('Nome de exibição*', { exact: true }).fill('Coletor em revisão')
  await page.getByLabel('Observação do colecionador (opcional)', { exact: true }).fill('Manter esta observação')
  await page.getByLabel('Usar outra carteira?', { exact: true }).check()
  await page.getByRole('combobox', { name: 'Carteira cadastrada' }).click()
  await page.getByRole('option', { name: `${wallet.label} — Polygon`, exact: true }).click()
  if (mobile) await page.getByRole('button', { name: 'Concluir revisão' }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  await event(page, { type: 'session.expire' })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.locator('.auth-form')).toBeVisible()
  await signInDialog(page)
  await expect(page).toHaveURL(/\/checkout$/)
  await page.reload()
  if (mobile) await page.getByRole('button', { name: 'Revisar dados' }).click()
  await expect(page.getByLabel('Nome de exibição*', { exact: true })).toHaveValue('Coletor em revisão')
  await expect(page.getByLabel('Observação do colecionador (opcional)', { exact: true })).toHaveValue('Manter esta observação')
  await expect(page.getByRole('combobox', { name: 'Carteira cadastrada' })).toContainText(wallet.label)
  await expect(page.getByLabel('Rede *', { exact: true })).toContainText('Polygon')
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('kurio_checkout_draft:')))).toEqual([])
  await login(page, 'sofia@kurio.art')
  expect((await api(page, 'POST', '/cart/items', { nftId: 'nft-1', edition: '1/50', quantity: 1 })).status).toBe(200)
  await page.goto('/checkout')
  if (mobile) await page.getByRole('button', { name: 'Revisar dados' }).click()
  await expect(page.getByLabel('Nome de exibição*', { exact: true })).toHaveValue('Sofia Silva')
  await expect(page.getByLabel('Observação do colecionador (opcional)', { exact: true })).toHaveValue('')
})

test('carrinho distingue falha de sessão e recupera pelo botão de nova tentativa', async ({ page }) => {
  await login(page)
  await scenario(page, 'network-error')
  await page.goto('/cart')
  await expect(page.getByRole('alert')).toContainText('Não foi possível recuperar sua sessão')
  await expect(page.getByRole('status').filter({ hasText: 'Carregando resumo' })).toHaveCount(0)
  await scenario(page, 'default')
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.locator('.cart-row')).toHaveCount(3)
  await expect(page.locator('.cart-totals')).toContainText('26.846 ETH')
  expect((await api<User>(page, 'GET', '/profile')).data.id).toBe('user-alex')
})

for (const network of ['Polygon', 'Solana'] as const) test(`recibo usa a rede ${network} e mantém o snapshot depois de mudança no catálogo`, async ({ page }) => {
  await login(page)
  const wallets = (await api<Wallet[]>(page, 'GET', '/wallets')).data
  const wallet = wallets.find(item => item.network === network) || (await api<Wallet>(page, 'POST', '/wallets', { network, address: '11111111111111111111111111111111', label: 'Solana de teste' })).data
  const payload = await payloadFor(page, wallet)
  const created = await api<Order>(page, 'POST', '/orders', payload, undefined, { 'Idempotency-Key': `receipt-${network}` })
  await api(page, 'POST', '/scenario/events', { type: 'order.resolve', id: created.data.id })
  await page.goto(`/orders/${created.data.id}`)
  await expect(page.locator('.order-receipt')).toContainText(`Transação confirmada na rede ${network}`)
  await expect(page.getByRole('button', { name: `Ver no ${network === 'Polygon' ? 'Polygonscan' : 'Solscan'}` })).toBeVisible()
  const confirmed = (await api<Order>(page, 'GET', `/orders/${created.data.id}`)).data
  await event(page, { type: 'nft.updated', id: 'nft-1', priceEth: '9.19' })
  await page.reload()
  await expect(page.locator('.order-receipt')).toContainText(`${confirmed.totalEth} ETH`)
  expect((await api<Order>(page, 'GET', `/orders/${created.data.id}`)).data).toEqual(confirmed)
  expect(await page.evaluate(() => sessionStorage.getItem('kurio_checkout_draft:user-alex'))).toBeNull()
})

test('login, cadastro e avisos ficam no centro da viewport ao abrir pelo Mercado', async ({ page }, info) => {
  const mobile = info.project.name.includes('Mobile')
  const assertPosition = async () => {
    const box = (await page.getByRole('dialog').boundingBox())!
    const viewport = page.viewportSize()!
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(1)
    if (mobile) expect(box.y).toBe(0)
    else expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(1)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
  }
  for (const height of mobile ? [844] : [900, 640]) {
    await page.setViewportSize({ width: mobile ? 390 : 1440, height })
    if (!mobile) await page.getByRole('banner').getByRole('link', { name: 'Mercado', exact: true }).click()
    await page.getByRole('button', { name: 'Entrar', exact: true }).filter({ visible: true }).first().click()
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
    await assertPosition()
    await page.getByRole('button', { name: mobile ? 'Novo na Kurio? Crie uma conta' : 'Criar conta', exact: true }).click()
    await expect(page.getByLabel('Nome completo')).toBeVisible()
    await assertPosition()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    if (!mobile) {
      await page.getByRole('button', { name: 'Criadores', exact: true }).filter({ visible: true }).first().click()
      await expect(page.getByRole('dialog')).toContainText('fora do escopo')
      await assertPosition()
      await page.getByRole('button', { name: 'Entendi', exact: true }).click()
    }
  }
})
