import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
await mkdir('artifacts/figma', { recursive: true })
const browser = await chromium.launch()
const requestedWidths = process.argv.slice(2).map(Number)
for (const width of requestedWidths.length ? requestedWidths : [414, 390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: ({414:896,390:844,768:1024,1440:900})[width] }, deviceScaleFactor: 1 })
  await page.clock.setFixedTime(new Date('2026-07-29T12:00:00Z'))
  page.on('pageerror', error => console.error(error.message))
  const capture = async name => {
    await page.evaluate(async () => {
      await document.fonts.load('400 14px "Roboto Mono"')
      await document.fonts.load('700 16px "Roboto Mono"')
      await document.fonts.ready
      await Promise.all(Array.from(document.images).map(image => { image.loading = 'eager'; return image.decode().catch(() => {}) }))
    })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    if (overflow) console.error(`Horizontal overflow: ${width}-${name}`)
    await page.screenshot({path:`artifacts/figma/${width}-${name}.png`, fullPage: width >= 768 })
  }
  for (const [name, path] of [['inicio','/'], ['detalhes','/nfts/nft-1'], ['login','/login'], ['cadastro','/cadastro']]) {
    await page.goto('http://127.0.0.1:5174' + path)
    await page.locator(name === 'inicio' ? '.nft-card' : name === 'detalhes' ? 'h1' : '[role="dialog"]').first().waitFor()
    if (name === 'login' || name === 'cadastro') await page.locator('.nft-card').first().waitFor()
    if (name === 'detalhes') await page.locator('.detail-related .nft-card').first().waitFor({state:'attached'})
    await capture(name)
  }
  await page.goto('http://127.0.0.1:5174/login')
  await page.getByLabel('E-mail', { exact: true }).fill('alex@kurio.art')
  await page.getByLabel('Senha', { exact: true }).fill('kurio123')
  await page.locator('button[type=submit]').filter({hasText: 'Entrar'}).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page.evaluate(async mobile => {
    const headers = { 'Content-Type':'application/json', Authorization: `Bearer ${localStorage.getItem('kurio_session_token')}` }
    if (mobile) {
      const cart = await (await fetch('/api/cart', {headers})).json()
      for (const [index,item] of cart.items.entries()) await fetch(`/api/cart/items/${item.id}`, {method:'PATCH',headers,body:JSON.stringify({quantity:index === 2 ? 2 : 1})})
      await fetch('/api/cart/items', {method:'POST',headers,body:JSON.stringify({nftId:'nft-7',edition:'1/50',quantity:2})})
    }
  }, width < 768)
  for (const [name,path] of [['carrinho','/cart'],['pagamento','/checkout'],['perfil','/profile'],['carteiras','/wallets']]) {
    const quoteReady = name === 'carrinho' || name === 'pagamento' ? page.waitForResponse(response => response.url().endsWith('/cart/quote') && response.status() === 200) : null
    await page.goto('http://127.0.0.1:5174' + path)
    console.log(width, name)
    await page.locator(name === 'carrinho' ? '.cart-row' : name === 'pagamento' ? '.payment-provider' : '.account-page form').first().waitFor()
    if (quoteReady) await quoteReady
    await capture(name)
  }
  await page.goto('http://127.0.0.1:5174/checkout')
  await page.getByRole('button', {name:'Confirmar compra',exact:true}).click()
  await page.getByRole('heading', {name:'Seus NFTs agora estão na sua carteira'}).waitFor({timeout:20000})
  await capture('confirmacao-pedido')
  await page.close()
}
await browser.close()
