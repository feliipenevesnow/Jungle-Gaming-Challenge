import { test, expect, type Page } from '@playwright/test'

async function signIn(page: Page, email = 'alex@kurio.art') {
  await page.goto('/favorites')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL(/\/favorites$/)
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error })
  await page.clock.setFixedTime(new Date('2026-07-29T12:00:00Z'))
})

test('cabeçalho: Mercado mostra o catálogo e Início volta ao destaque', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'O frame mobile usa a navegação inferior.')
  for (const origin of ['/', '/nfts/nft-1']) {
    await page.goto(origin)
    await expect(page.locator(origin === '/' ? '.nft-card' : '.detail-info h1').first()).toBeVisible()
    await page.getByRole('banner').getByRole('link', { name: 'Mercado', exact: true }).click()
    await expect(page).toHaveURL(url => url.pathname === '/' && url.hash === '#catalogo')
    await expect(page.locator('.nft-card')).toHaveCount(9)
    await expect.poll(() => page.locator('#catalogo').evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(5)
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300)
    await page.getByRole('banner').getByRole('link', { name: 'Início', exact: true }).click()
    await expect(page).toHaveURL(url => url.pathname === '/' && url.hash === '')
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    await expect(page.locator('.hero')).toBeInViewport()
  }
})

test('cabeçalho: Criadores, Aprenda, busca, carrinho e Entrar dão retorno visível', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'O cabeçalho não aparece no frame mobile.')
  await page.goto('/')
  const header = page.getByRole('banner')
  for (const name of ['Criadores', 'Aprenda']) {
    const trigger = header.getByRole('button', { name, exact: true })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name, exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('fora do escopo')
    await page.getByRole('button', { name: 'Entendi' }).click()
    await expect(trigger).toBeFocused()
  }
  await header.getByRole('link', { name: 'Buscar no catálogo' }).click()
  await expect(page.locator('.catalog-search input')).toBeFocused()
  await expect(page.locator('.catalog-search input')).toBeInViewport()
  await header.getByRole('link', { name: /Carrinho com/ }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.locator('.cart-row').first()).toBeVisible()
  await header.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
})

test('menu inferior deixa o conteúdo visível através da curva', async ({ page }, info) => {
  test.skip(!info.project.name.includes('mobile'), 'O menu inferior existe no frame mobile.')
  await page.goto('/')
  await expect(page.locator('.nft-card')).toHaveCount(9)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})))
  })
  const menu = page.getByRole('navigation', { name: 'Navegação principal mobile' })
  const box = (await menu.boundingBox())!
  await expect(page).toHaveScreenshot('menu-inferior.png', { clip: { x: 0, y: box.y - 32, width: box.width, height: box.height + 32 } })
  // Paint a contrasting subject below the menu. The cutout must reveal it, not a dark disk.
  await page.evaluate(() => {
    const subject = document.createElement('div')
    subject.id = 'transparency-subject'
    subject.style.cssText = 'position:fixed;inset:auto 0 0;height:95px;background:rgb(0,170,255);z-index:39'
    document.body.append(subject)
  })
  const png = await page.screenshot()
  const pixels = await page.evaluate(async ({ bytes, y, center }) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width; canvas.height = bitmap.height
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    return [Array.from(context.getImageData(center + 35, y + 30, 1, 1).data), Array.from(context.getImageData(40, y + 30, 1, 1).data)]
  }, { bytes: Array.from(png), y: box.y, center: box.width / 2 })
  expect(pixels[0]).toEqual([0, 170, 255, 255])
  expect(pixels[1]).toEqual([36, 22, 18, 255])
  await page.locator('#transparency-subject').evaluate(element => element.remove())
  await menu.getByRole('link', { name: 'Favoritos', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Entrar no Kurio' })).toBeVisible()
})

test('favoritos: autenticação, remoção, persistência e isolamento entre usuários', async ({ page }) => {
  await signIn(page)
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(2)
  const emerald = page.locator('.nft-card').filter({ hasText: 'Emerald Ape' })
  await emerald.getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' }).filter({ visible: true }).first().click()
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(1)
  await expect(page.locator('.favorites-page')).toHaveAttribute('aria-busy', 'false')
  await page.reload()
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(1)
  await expect(page.locator('.favorites-page')).toContainText('Neon Vessel')
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await signIn(page, 'sofia@kurio.art')
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(1)
  await expect(page.locator('.favorites-page')).toContainText('Sage Nomad')
  await expect(page.locator('.favorites-page')).not.toContainText('Neon Vessel')
})

test('favoritos: falha da API desfaz a remoção e permite tentar de novo', async ({ page }) => {
  await signIn(page)
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(2)
  await page.evaluate(() => localStorage.setItem('kurio_msw_scenario', '500-error'))
  const response = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes('/favorites/nft-1'))
  await page.getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' }).filter({ visible: true }).first().click()
  expect((await response).status()).toBe(500)
  await page.evaluate(() => localStorage.removeItem('kurio_msw_scenario'))
  await expect(page.getByRole('dialog')).toContainText('A alteração foi desfeita')
  await page.getByRole('button', { name: 'Entendi' }).click()
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' }).filter({ visible: true }).first().click()
  await expect(page.locator('.favorites-page .nft-card')).toHaveCount(1)
})

test('ações auxiliares informam indisponibilidade e coleções filtram o catálogo', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'O rodapé não é exibido no frame mobile.')
  await page.goto('/')
  const footer = page.locator('footer')
  const help = footer.getByRole('button', { name: 'Central de ajuda', exact: true })
  await help.click()
  await expect(page.getByRole('dialog')).toContainText('fora do escopo')
  await page.keyboard.press('Escape')
  await expect(help).toBeFocused()
  await footer.getByLabel('E-mail para novidades').fill('visitante@example.com')
  await footer.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('não foi enviado nem cadastrado')
  await page.getByRole('button', { name: 'Entendi' }).click()
  await footer.getByRole('button', { name: 'Instagram', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Não há um perfil oficial')
  await page.getByRole('button', { name: 'Entendi' }).click()
  await footer.getByRole('link', { name: 'Fotografia', exact: true }).click()
  await expect(page).toHaveURL(/collection=Fotografia/)
  await expect(page.locator('.nft-card')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.nft-card')).toHaveCount(1)
})

test('ampliar imagem funciona e cópia negada não aparenta sucesso', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'Os controles de zoom e compartilhamento são do detalhe desktop.')
  await page.goto('/nfts/nft-1')
  const zoom = page.getByRole('button', { name: 'Ampliar imagem do NFT' })
  await zoom.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog').getByRole('img')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(zoom).toBeFocused()
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('permission denied')) } }))
  await page.getByRole('button', { name: 'Copiar link do NFT' }).click()
  await expect(page.getByRole('dialog')).toContainText('Não foi possível copiar')
})
