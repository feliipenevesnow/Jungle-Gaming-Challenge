import { test, expect, type Page } from '@playwright/test'
import type { MockDatabaseState } from '../../src/mocks/db'
import type { NFT } from '../../src/types/api'

async function prepareDatabase(page: Page) {
  await page.goto('/')
  await expect(page.locator('.nft-card').first()).toBeVisible()
  await page.evaluate(() => fetch('/api/reset', { method: 'POST' }))
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error })
})

test.describe('Detalhes do NFT', () => {
  test('abre o detalhe pelo catálogo e todos os NFTs por acesso direto', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('.nft-card').filter({ hasText: 'Emerald Ape #042' })
    await card.locator('h3').click()
    await expect(page).toHaveURL(/\/nfts\/nft-1$/)
    const ids = await page.evaluate(async () => {
      const response = await fetch('/api/nfts?limit=100')
      const data: { items: NFT[] } = await response.json()
      return data.items.map(item => ({ id: item.id, name: item.name }))
    })
    for (const nft of ids) {
      await page.goto(`/nfts/${nft.id}`)
      await expect(page.getByRole('heading', { name: nft.name, exact: true })).toBeVisible()
      await expect(page.locator('.detail-quantity')).toContainText('1')
      await expect(page.getByRole('button', { name: 'Adicionar ao Carrinho', exact: true })).toBeEnabled()
      await expect(page.getByText('Something went wrong!')).toHaveCount(0)
    }
  })

  test('NFT inexistente oferece retorno ao catálogo', async ({ page }) => {
    await page.goto('/nfts/nft-inexistente-9999')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao catálogo', exact: true }).click()
    await expect(page.locator('.nft-card').first()).toBeVisible()
  })

  test('restaura metadados de instalação antiga sem apagar dados persistidos', async ({ page }) => {
    await prepareDatabase(page)
    const preserved = await page.evaluate(() => {
      const key = 'kurio_mock_database_v2'
      const state: MockDatabaseState = JSON.parse(localStorage.getItem(key)!)
      const legacy: Partial<NFT> = state.nfts[0]
      delete legacy.contractAddress
      delete legacy.about
      delete legacy.attributes
      delete legacy.thumbnails
      delete legacy.creatorRoyaltyPercent
      legacy.priceEth = '2.37'
      legacy.availableQuantity = 7
      state.users[0].name = 'Colecionador persistido'
      state.cartByUser.guest[0].quantity = 1
      localStorage.setItem(key, JSON.stringify(state))
      return { users: state.users, cart: state.cartByUser, favorites: state.favoritesByUser, orders: state.orders }
    })
    // Reload from the old persisted shape, then reproduce the user's catalog-to-detail click.
    await page.reload()
    await page.locator('.nft-card').filter({ hasText: 'Emerald Ape #042' }).locator('h3').click()
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
    await expect(page.locator('.detail-price-rating')).toContainText('2.37 ETH')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
    const restored = await page.evaluate(() => {
      const state: MockDatabaseState = JSON.parse(localStorage.getItem('kurio_mock_database_v2')!)
      return { nft: state.nfts[0], users: state.users, cart: state.cartByUser, favorites: state.favoritesByUser, orders: state.orders }
    })
    expect(restored.nft.contractAddress).toMatch(/^0x/)
    expect(restored.nft.availableQuantity).toBe(7)
    expect(restored.nft.priceEth).toBe('2.37')
    expect({ users: restored.users, cart: restored.cart, favorites: restored.favorites, orders: restored.orders }).toEqual(preserved)
    await expect(page.getByText('Something went wrong!')).toHaveCount(0)
  })

  test('metadados ausentes ou inválidos não derrubam NFTs sem fixture de origem', async ({ page }, info) => {
    await prepareDatabase(page)
    await page.evaluate(() => {
      const key = 'kurio_mock_database_v2'
      const state: MockDatabaseState = JSON.parse(localStorage.getItem(key)!)
      const variants = [undefined, null, 123].map((contractAddress, index) => ({
        ...state.nfts[0], id: `custom-${index}`, name: `NFT sem contrato ${index}`,
        contractAddress, thumbnails: null, attributes: { unexpected: true },
      }))
      localStorage.setItem(key, JSON.stringify({ ...state, nfts: [...state.nfts, ...variants] }))
    })
    for (const index of [0, 1, 2]) {
      await page.goto(`/nfts/custom-${index}`)
      await expect(page.getByRole('heading', { name: `NFT sem contrato ${index}`, exact: true })).toBeVisible()
      if (!info.project.name.includes('Mobile')) {
        await expect(page.getByText('Endereço do contrato não informado.')).toBeVisible()
      }
      await expect(page.getByRole('button', { name: 'Adicionar ao Carrinho', exact: true })).toBeEnabled()
      await expect(page.getByText('Something went wrong!')).toHaveCount(0)
    }
  })
})
