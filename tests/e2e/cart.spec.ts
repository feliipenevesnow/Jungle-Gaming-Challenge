import { test, expect, api, login } from './support'
import type { CartState, QuoteResponse } from '../../src/types/api'

test('quantidade, remoção, cupom e soma monetária permanecem corretos após refresh e login', async ({ page }) => {
  const cart = await api<CartState>(page, 'GET', '/cart')
  for (const item of cart.data.items) await api(page, 'DELETE', `/cart/items/${item.id}`)
  await page.goto('/nfts/nft-1')
  await page.getByRole('button', { name: 'Adicionar ao Carrinho', exact: true }).click()
  await page.getByRole('textbox', { name: 'Código promocional' }).fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(page.locator('.cart-totals')).toContainText('1.087 ETH')
  expect((await api<CartState>(page, 'GET', '/cart')).data).toMatchObject({ subtotalEth: '1.19', discountEth: '0.119', totalEth: '1.087', couponCode: 'KURIO10' })
  const quote = await api<QuoteResponse>(page, 'POST', '/cart/quote', { items: [{ nftId: 'nft-1', edition: '1/50', quantity: 1 }], network: 'Ethereum', couponCode: 'KURIO10' })
  expect(quote.data).toMatchObject({ subtotalEth: '1.19', discountEth: '0.119', networkFeeEth: '0.016', totalEth: '1.087' })
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: 'KURIO10' })).toBeVisible()
  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await page.getByRole('button', { name: 'Aumentar quantidade', exact: true }).click()
  await expect(page.locator('.cart-totals')).toContainText('2.396 ETH')
  const before = (await api<CartState>(page, 'GET', '/cart')).data.items[0]
  expect((await api(page, 'PATCH', `/cart/items/${before.id}`, { quantity: 1.5 })).status).toBe(400)
  expect((await api(page, 'PATCH', `/cart/items/${before.id}`, { quantity: 999 })).status).toBe(409)
  expect((await api(page, 'POST', '/cart/items', { nftId: 'nft-1', edition: 'INVALID', quantity: 1 })).status).toBe(400)
  await login(page)
  const merged = (await api<CartState>(page, 'GET', '/cart')).data.items.find(item => item.nftId === 'nft-1')!
  expect(merged.quantity).toBe(4) // Two independent guest additions plus the two account seed editions.
  await page.goto('/cart')
  const row = page.locator('.cart-row').first()
  for (let amount = 4; amount >= 1; amount--) {
    await expect(row.locator('.cart-stepper')).toContainText(String(amount))
    await row.getByRole('button', { name: 'Diminuir quantidade', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Remover item', exact: true }).click()
  await expect(page.locator('.cart-row')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.cart-row')).toHaveCount(2)
})
