import { test, expect, api, login, scenario, event } from './support'
import type { CartState, CreateOrderPayload, NFTListResponse, Order, QuoteResponse, User, Wallet } from '../../src/types/api'

async function orderPayload(page: Parameters<typeof login>[0]): Promise<CreateOrderPayload> {
  const wallet = (await api<Wallet[]>(page, 'GET', '/wallets')).data[0]
  const user = (await api<User>(page, 'GET', '/profile')).data
  await api(page, 'POST', `/wallets/${wallet.id}/connect`, { provider: 'MetaMask' })
  return { items: [{ nftId: 'nft-1', edition: '1/50', quantity: 3 }], network: wallet.network, walletAddress: wallet.address, collector: { displayName: user.name, username: user.username, profileName: user.name, email: user.email, referralCode: 'KURIO-2026', ensName: 'colecionador', walletType: 'MetaMask' } }
}

test('ordenação por preço preserva a sequência visual dos nove cards', async ({ page }, info) => {
  const mobile = info.project.name.includes('Mobile')
  if (mobile) await page.getByRole('button', { name: 'Filtros do catálogo' }).click()
  for (const option of ['Menor preço', 'Maior preço']) {
    await page.getByRole('combobox', { name: 'Ordenar NFTs' }).click()
    await page.getByRole('option', { name: option, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`sort=${option === 'Menor preço' ? 'price_asc' : 'price_desc'}`))
    await expect(page.locator('#catalogo')).toHaveAttribute('aria-busy', 'false')
    await expect(page.locator('.nft-card')).toHaveCount(9)
    const prices = await page.locator('.nft-caption > div > span:first-child').allTextContents()
    const numeric = prices.map(text => Number(text.replace(' ETH', '').trim()))
    expect(numeric).toEqual([...numeric].sort((a, b) => option === 'Menor preço' ? a - b : b - a))
    expect(await page.locator('.nft-card').evaluateAll(cards => cards.map(card => getComputedStyle(card).order))).toEqual(Array(9).fill('0'))
  }
})

test('ajuste ao estoque respeita duas edições do mesmo NFT e o limite total', async ({ page }) => {
  await login(page)
  expect((await api(page, 'POST', '/cart/items', { nftId: 'nft-1', edition: '1/10', quantity: 4 })).status).toBe(200)
  await page.goto('/cart')
  await event(page, { type: 'nft.updated', id: 'nft-1', availableQuantity: 3 })
  await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  await page.getByRole('button', { name: 'Ajustar quantidades ao estoque' }).click()
  await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeEnabled()
  const rows = (await api<CartState>(page, 'GET', '/cart')).data.items.filter(item => item.nftId === 'nft-1')
  expect(rows.map(({ edition, quantity }) => ({ edition, quantity }))).toEqual([{ edition: '1/50', quantity: 2 }, { edition: '1/10', quantity: 1 }])
  await expect(page.locator('.cart-row').filter({ hasText: 'Emerald Ape' })).toHaveCount(2)
})

test('reservas pendentes limitam a soma de quantidades entre edições', async ({ page }) => {
  await login(page)
  await event(page, { type: 'nft.updated', id: 'nft-1', availableQuantity: 5 })
  await scenario(page, 'order-pending')
  const payload = await orderPayload(page)
  const created = await api<Order>(page, 'POST', '/orders', payload, undefined, { 'Idempotency-Key': 'reserved-first' })
  expect(created.data.status).toBe('PENDING')
  const items: CreateOrderPayload['items'] = [{ nftId: 'nft-1', edition: '1/10', quantity: 2 }, { nftId: 'nft-1', edition: 'ABERTA', quantity: 2 }]
  const quote = await api<QuoteResponse>(page, 'POST', '/cart/quote', { items, network: 'Ethereum' })
  expect(quote.data.valid).toBe(false)
  expect((await api(page, 'POST', '/orders', { ...payload, items }, undefined, { 'Idempotency-Key': 'over-reservation' })).status).toBe(409)
  await page.clock.fastForward(6000)
  expect((await api<Order>(page, 'GET', `/orders/${created.data.id}`)).data.status).toBe('CONFIRMED')
  expect((await api<Order[]>(page, 'GET', '/orders')).data).toHaveLength(1)
})

for (const source of ['cart', 'wallets']) test(`checkout distingue falha de ${source} e recupera por nova tentativa`, async ({ page }) => {
  await login(page)
  await scenario(page, `${source}-error`)
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar o pagamento' })).toBeVisible()
  await expect(page.getByText('Seu carrinho está vazio')).toHaveCount(0)
  await expect(page.getByText('Cadastre uma carteira para confirmar a compra.')).toHaveCount(0)
  await scenario(page, 'default')
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
})

test('carteiras mostram erro da listagem e permitem recuperar os dados', async ({ page }) => {
  await login(page)
  await scenario(page, 'wallets-error')
  await page.goto('/wallets')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar')
  await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toHaveCount(0)
  await scenario(page, 'default')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.locator('.saved-wallet')).toHaveCount(2)
})

test('checkout permite corrigir dados do coletor em desktop e mobile', async ({ page }, info) => {
  await login(page)
  await page.goto('/checkout')
  const mobile = info.project.name.includes('Mobile')
  if (mobile) await page.getByRole('button', { name: 'Revisar dados' }).click()
  await page.getByLabel('Nome de exibição*', { exact: true }).fill('')
  await page.getByRole('button', { name: mobile ? 'Concluir revisão' : 'Confirmar compra', exact: true }).click()
  await expect(page.getByLabel('Nome de exibição*', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Informe o nome de exibição.', { exact: true })).toBeVisible()
  await page.getByLabel('Nome de exibição*', { exact: true }).fill('Coletor revisado')
  await page.getByLabel('Nome ENS *', { exact: true }).fill('coletor.eth')
  if (mobile) await page.getByRole('button', { name: 'Concluir revisão' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  expect((await api<Order[]>(page, 'GET', '/orders')).data[0].collector?.displayName).toBe('Coletor revisado')
})

test('estoque muda por Socket.IO com o checkout aberto e bloqueia a confirmação', async ({ page }) => {
  await login(page)
  await page.goto('/checkout')
  const confirm = page.getByRole('button', { name: 'Confirmar compra' })
  await expect(confirm).toBeEnabled()
  await event(page, { type: 'nft.updated', id: 'nft-1', availableQuantity: 0 })
  await expect(confirm).toBeDisabled()
  await expect(page.getByRole('alert').filter({ hasText: 'apenas 0 unidades' }).first()).toBeVisible()
  expect((await api<Order[]>(page, 'GET', '/orders')).data).toHaveLength(0)
})

test('TTL real expira pelo relógio e mantém o checkout para retomar o login', async ({ page }) => {
  await login(page)
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  await page.clock.fastForward(24 * 60 * 60 * 1000 + 1000)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveURL(/\/checkout$/)
  await page.getByLabel('E-mail', { exact: true }).fill('alex@kurio.art')
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
})

test('reset cancela alteração agendada e remove tentativas antigas sem recarregar', async ({ page }) => {
  await scenario(page, 'price-changed')
  await api(page, 'POST', '/cart/quote', { items: [{ nftId: 'nft-1', edition: '1/50', quantity: 1 }], network: 'Ethereum' })
  await page.evaluate(() => localStorage.setItem('kurio_purchase_attempt:user-alex', JSON.stringify({ key: 'old-attempt', payload: {} })))
  await api(page, 'POST', '/reset')
  await page.clock.fastForward(1000)
  expect((await api<{ priceEth: string }>(page, 'GET', '/nfts/nft-1')).data.priceEth).toBe('1.19')
  expect(await page.evaluate(() => localStorage.getItem('kurio_purchase_attempt:user-alex'))).toBeNull()
  await expect(page.locator('.nft-card').first()).toContainText('1.19 ETH')
})

test('faixa de preço preserva strings exatas na API, URL e após refresh', async ({ page }, info) => {
  await event(page, { type: 'nft.updated', id: 'nft-10', priceEth: '0.000000000000000001' })
  expect((await api<NFTListResponse>(page, 'GET', '/nfts')).data.priceRange.min).toBe('0.000000000000000001')
  if (info.project.name.includes('Mobile')) await page.getByRole('button', { name: 'Filtros do catálogo' }).click()
  await page.getByRole('button', { name: 'Editar faixa de preço' }).click()
  await page.getByLabel('Preço mínimo em ETH').fill('0.000000000000000001')
  await page.getByLabel('Preço máximo em ETH').fill('1.190000000000000001')
  await page.getByRole('button', { name: 'Aplicar faixa', exact: true }).click()
  await expect(page).toHaveURL(/minPrice=0.000000000000000001/)
  expect(new URL(page.url()).searchParams.get('maxPrice')).toBe('1.190000000000000001')
  await page.reload()
  if (info.project.name.includes('Mobile')) await page.getByRole('button', { name: 'Filtros do catálogo' }).click()
  await page.getByRole('button', { name: 'Editar faixa de preço' }).click()
  await expect(page.getByLabel('Preço máximo em ETH')).toHaveValue('1.190000000000000001')
})

test('Tab e Shift+Tab percorrem o diálogo sem perder o foco e Escape restaura o gatilho', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Entrar', exact: true }).filter({ visible: true }).first()
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const visited = new Set<string>()
  for (const direction of ['Tab', 'Shift+Tab']) for (let i = 0; i < 18; i++) {
    await page.keyboard.press(direction)
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true)
    visited.add(await page.evaluate(() => document.activeElement?.id || ''))
  }
  expect(visited.has('auth-email')).toBe(true)
  expect(visited.has('auth-password')).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('favoritos abertos acompanham os preços recebidos por Socket.IO', async ({ page }) => {
  await login(page)
  await page.goto('/favorites')
  const card = page.locator('.nft-card').filter({ hasText: 'Emerald Ape' })
  await expect(card).toContainText('1.19 ETH')
  await event(page, { type: 'nft.updated', id: 'nft-1', priceEth: '2.19' })
  await expect(card).toContainText('2.19 ETH')
})

test('skeleton do catálogo preserva o tamanho do primeiro card final', async ({ page }) => {
  await page.evaluate(() => document.fonts.ready)
  const finalCard = await page.locator('.nft-card').first().boundingBox()
  const finalArt = await page.locator('.nft-card .nft-art').first().boundingBox()
  await scenario(page, 'slow-network')
  await page.reload()
  await page.locator('.nft-skeleton').first().waitFor()
  const loadingCard = await page.locator('.nft-skeleton').first().boundingBox()
  const loadingArt = await page.locator('.nft-skeleton .nft-art').first().boundingBox()
  expect(loadingCard!.width).toBeCloseTo(finalCard!.width, 0)
  expect(loadingCard!.height).toBeCloseTo(finalCard!.height, 0)
  expect(loadingArt!.height).toBeCloseTo(finalArt!.height, 0)
})

test('cupom que expira deixa de aplicar desconto e pode ser removido', async ({ page }) => {
  await api(page, 'PUT', '/cart/coupon', { code: 'KURIO10' })
  expect((await api<CartState>(page, 'GET', '/cart')).data).toMatchObject({ discountEth: '2.683', totalEth: '24.163' })
  await page.goto('/cart')
  await expect(page.locator('.cart-totals')).toContainText('24.163 ETH')
  const expiresAt = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('kurio_mock_database_v2')!)
    return state.coupons.find((coupon: { code: string }) => coupon.code === 'KURIO10').expiresAt
  })
  await page.clock.setSystemTime(new Date(new Date(expiresAt).getTime() - 1000))
  await page.clock.fastForward(2000)
  const expired = await api<CartState>(page, 'GET', '/cart')
  expect(expired.status).toBe(200)
  expect(expired.data.discountEth).toBe('0.00')
  expect(expired.data.couponError).toContain('inválido ou expirado')
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: 'indisponível' })).toBeVisible()
  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeEnabled()
  expect((await api<CartState>(page, 'GET', '/cart')).data.couponCode).toBeUndefined()
})
