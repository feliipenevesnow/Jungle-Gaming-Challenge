import { test, expect, type Page } from '@playwright/test'

async function signIn(page: Page, email = 'alex@kurio.art', password = 'kurio123') {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error })
  await page.goto('/')
  await expect(page.locator('.nft-card').first()).toBeVisible()
  await page.evaluate(() => fetch('/api/reset', { method: 'POST' }))
})

test('conta antiga mantém sua senha e passa a armazenar hash após login', async ({ page }) => {
  await page.evaluate(() => {
    const key = 'kurio_mock_database_v2'
    const state = JSON.parse(localStorage.getItem(key)!)
    state.users[0].passwordHash = 'senha-antiga-123'
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.goto('/login')
  await signIn(page, 'ALEX@KURIO.ART', 'senha-antiga-123')
  const hash = await page.evaluate(() => JSON.parse(localStorage.getItem('kurio_mock_database_v2')!).users[0].passwordHash)
  expect(hash).toMatch(/^pbkdf2\$/)
  expect(hash).not.toContain('senha-antiga-123')
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.goto('/login')
  await signIn(page, 'alex@kurio.art', 'senha-antiga-123')
})

test('credenciais corretas funcionam após senha errada, refresh e troca de conta', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('alex@kurio.art')
  await page.getByLabel('Senha', { exact: true }).fill('errada')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByText('Credenciais inválidas. Verifique seu e-mail e senha.')).toBeVisible()
  await signIn(page)
  await page.goto('/profile')
  await expect(page.getByPlaceholder('Seu nome completo')).toHaveValue('Alex Vance')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.goto('/login')
  await signIn(page, 'sofia@kurio.art')
  await page.goto('/profile')
  await expect(page.getByPlaceholder('Seu nome completo')).toHaveValue('Sofia Silva')
})

test('cadastro permite sair, entrar novamente e cadastrar carteira para comprar', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByLabel('Nome completo').fill('Nova Colecionadora')
  await page.getByLabel('E-mail', { exact: true }).fill('nova@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('nova1234')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('nova1234')
  await page.locator('.auth-form button[type=submit]').click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await page.goto('/login')
  await signIn(page, 'nova@example.test', 'nova1234')
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  await page.getByRole('link', { name: 'Adicionar carteira', exact: true }).click()
  const networkSelect = page.getByLabel('Rede *', { exact: true })
  await networkSelect.press('ArrowDown')
  const networkOptions = page.getByRole('listbox')
  await expect(networkOptions).toBeVisible()
  await networkOptions.press('p')
  await expect(page.getByRole('option', { name: 'Polygon', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(networkSelect).toContainText('Polygon')
  await page.getByLabel('Endereço da carteira*', { exact: true }).fill('0x1234567890123456789012345678901234567890')
  await page.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira salva com sucesso!')).toBeVisible()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
})

