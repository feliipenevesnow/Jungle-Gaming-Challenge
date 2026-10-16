import { test, expect, type Page } from '@playwright/test'

async function ready(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.load('400 14px "Roboto Mono"')
    await document.fonts.load('700 16px "Roboto Mono"')
    await document.fonts.ready
    await Promise.all(Array.from(document.images).map(image => { image.loading = 'eager'; return image.decode().catch(() => {}) }))
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('alex@kurio.art')
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByRole('dialog')).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-29T12:00:00Z'))
  page.on('pageerror', error => { throw error })
})

test('início: composição responsiva, busca e filtros acessíveis', async ({ page }, info) => {
  const mobile = info.project.name.includes('mobile')
  await page.goto('/')
  await expect(page.locator('.nft-card')).toHaveCount(9)
  await ready(page)
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: !mobile })
  const cards = page.locator('.nft-card')
  if (mobile) {
    await expect(page.getByRole('navigation', { name: 'Navegação principal mobile' })).toBeVisible()
    const first = await cards.nth(0).boundingBox()
    const second = await cards.nth(1).boundingBox()
    expect(second!.x).toBeGreaterThan(first!.x + first!.width)
    await page.getByRole('button', { name: 'Filtros do catálogo', exact: true }).click()
    await expect(page.locator('.filter-panel')).toBeVisible()
    await page.getByRole('button', { name: 'Ver resultados', exact: true }).click()
  } else {
    const artworkHeights = await page.locator('.nft-art').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height))
    // Portrait source assets must not stretch their row or push the sections below it.
    expect(Math.max(...artworkHeights) - Math.min(...artworkHeights)).toBeLessThan(1)
    await page.getByRole('link', { name: 'Buscar no catálogo' }).click()
  }
  const search = mobile ? page.getByRole('textbox', { name: 'Buscar coleções' }) : page.locator('.catalog-search input')
  await search.fill('Emerald Ape')
  await search.press('Enter')
  await expect(page).toHaveURL(/search=Emerald/)
  await expect(cards).toHaveCount(1)
  await page.reload()
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('Emerald Ape #042')
})

test('detalhe: galeria, edição e quantidade permanecem funcionais', async ({ page }, info) => {
  const mobile = info.project.name.includes('mobile')
  await page.goto('/nfts/nft-1')
  await expect(page.locator('.detail-related .nft-card')).toHaveCount(5)
  await ready(page)
  await expect(page).toHaveScreenshot('detalhes.png', { fullPage: !mobile })
  await page.getByRole('button', { name: 'Aumentar quantidade', exact: true }).click()
  await expect(page.locator('.detail-quantity')).toContainText('2')
  await page.getByRole('button', { name: '1/10', exact: true }).click()
  await expect(page.getByRole('button', { name: '1/10', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Adicionar ao Carrinho', exact: true }).click()
  await expect(page).toHaveURL(/\/cart/)
  await expect(page.locator('.cart-row').filter({ hasText: 'Emerald Ape #042' }).last()).toContainText('2')
})

test('autenticação: frames, confirmação de senha e restauração de sessão', async ({ page }) => {
  for (const [path, name] of [['/login', 'login'], ['/cadastro', 'cadastro']]) {
    await page.goto(path)
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.locator('.nft-card')).toHaveCount(9)
    await ready(page)
    const dialog = (await page.getByRole('dialog').boundingBox())!
    const viewport = page.viewportSize()!
    expect(Math.abs(dialog.x + dialog.width / 2 - viewport.width / 2)).toBeLessThan(1)
    expect(dialog.y).toBeGreaterThanOrEqual(0)
    expect(dialog.x).toBeGreaterThanOrEqual(0)
    await expect(page).toHaveScreenshot(`${name}.png`)
  }
  await page.getByLabel('Nome completo').fill('Colecionador Teste')
  await page.getByLabel('E-mail', { exact: true }).fill('colecionador@teste.example')
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('diferente')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByText('A confirmação de senha não confere.')).toBeVisible()
  await login(page)
  await page.goto('/profile')
  await expect(page.locator('.account-page form')).toBeVisible()
  await page.reload()
  await expect(page.locator('.account-page form')).toBeVisible()
  await ready(page)
})

test('carrinho, carteiras, pagamento e recibo conservam os valores da API', async ({ page }, info) => {
  const mobile = info.project.name.includes('mobile')
  await login(page)
  if (mobile) {
    await page.evaluate(async () => {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('kurio_session_token')}` }
      const cart = await (await fetch('/api/cart', { headers })).json()
      for (const [index, item] of cart.items.entries()) await fetch(`/api/cart/items/${item.id}`, { method: 'PATCH', headers, body: JSON.stringify({ quantity: index === 2 ? 2 : 1 }) })
      await fetch('/api/cart/items', { method: 'POST', headers, body: JSON.stringify({ nftId: 'nft-7', edition: '1/50', quantity: 2 }) })
    })
  }
  const total = mobile ? '8.156 ETH' : '26.846 ETH'
  await page.goto('/cart')
  await expect(page.locator('.cart-totals')).toContainText(total)
  await ready(page)
  await expect(page).toHaveScreenshot('carrinho.png', { fullPage: !mobile })
  for (const [path, name] of [['/profile', 'perfil'], ['/wallets', 'carteiras']]) {
    await page.goto(path)
    await expect(page.locator('.account-page form')).toBeVisible()
    await ready(page)
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true })
  }
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled()
  await expect(page.locator(mobile ? '.checkout-mobile-total' : '.checkout-summary')).toContainText(total)
  await ready(page)
  await expect(page).toHaveScreenshot('pagamento.png', { fullPage: !mobile })
  await page.getByRole('radio', { name: /MetaMask/ }).check()
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(page.locator('.order-receipt')).toContainText(total)
  await expect(page.locator('.order-receipt')).toContainText('#0042')
  await ready(page)
  await expect(page).toHaveScreenshot('confirmacao-pedido.png', { fullPage: true, mask: [page.locator('.order-receipt .grid > div:first-child')] })
})
