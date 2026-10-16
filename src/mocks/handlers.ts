import { http, HttpResponse, delay, passthrough } from 'msw'
import { db } from './db'
import { hashPassword, verifyPassword } from './password'
import { socketHandler, disconnectClients, broadcastNftUpdated, broadcastOrderUpdated, hasSocketClient } from './socket'
import { ApiFailure, object, text, email, password, username, walletAddress, network, quantity, items, eth, profile } from './validation'
import { calculateQuote } from './quote'
import { createOrder, resumeOrders, settleOrder, cancelOrderTimers, publishNFT, nftUpdateEvent } from './orders'
import { parseEthToBigInt } from '@/lib/decimal'
import { clearAllAttempts } from '@/lib/purchase'
import type { EditionType, NetworkType, NFTUpdatedEvent, OrderUpdatedEvent, Wallet, QuoteResponse } from '@/types/api'

type Context = { request: Request; params: Record<string, string | readonly string[] | undefined> }
const scenarioOf = (request: Request) => request.headers.get('x-msw-scenario') || localStorage.getItem('kurio_msw_scenario') || 'default'
const tokenOf = (request: Request) => request.headers.get('Authorization')?.replace(/^Bearer /, '') || ''
function identity(request: Request, required = true): string {
  const token = tokenOf(request)
  if (scenarioOf(request) === 'session-expired' && token) {
    db.revokeSession(token)
    localStorage.removeItem('kurio_msw_scenario')
  }
  const session = db.getSession(token)
  if (!session && (required || token)) throw new ApiFailure('Sua sessão expirou. Entre novamente para continuar.', 401)
  return session?.userId || 'guest'
}
const publicUser = (user: NonNullable<ReturnType<typeof db.getUserById>>) => {
  const { passwordHash: _hash, ...data } = user
  return data
}
function route(method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string, resolver: (context: Context) => Response | Promise<Response>, simulated = true) {
  return http[method](path, async context => {
    try {
      resumeOrders()
      if (simulated) {
        const scenario = scenarioOf(context.request)
        if ((scenario === 'cart-error' && path === '/api/cart') || (scenario === 'wallets-error' && path === '/api/wallets')) return HttpResponse.json({ message: 'Não foi possível carregar os dados. Tente novamente.' }, { status: 500 })
        if (['500-error', 'network-error'].includes(scenario)) return HttpResponse.json({ message: 'Erro interno simulado no servidor (500).' }, { status: 500 })
        if (scenario === 'offline') return HttpResponse.error()
        if (['slow-network', 'latency-high'].includes(scenario)) await delay(1500)
        else if (scenario === 'variable-latency') await delay(new URL(context.request.url).searchParams.get('search') === 'Emerald' ? 700 : 80)
        else await delay(120)
      }
      return await resolver(context)
    } catch (error) {
      if (error instanceof ApiFailure) return HttpResponse.json({ message: error.message, fieldErrors: error.fieldErrors }, { status: error.status })
      console.error('[Mock API]', error)
      return HttpResponse.json({ message: 'Não foi possível processar os dados.' }, { status: 400 })
    }
  })
}
function walletMetadata(value: unknown): Wallet['metadata'] {
  if (value === undefined) return undefined
  const data = object(value)
  return { displayName: text(data.displayName, 'Nome de exibição'), profileName: text(data.profileName, 'Nome do perfil'), secondaryEns: text(data.secondaryEns, 'Carteira secundária', false), walletType: text(data.walletType, 'Tipo de carteira'), referralCode: text(data.referralCode, 'Código de indicação'), ensName: text(data.ensName, 'Nome ENS') }
}
let scheduledPrice = false
let priceTimer: ReturnType<typeof setTimeout> | undefined
const deferredNftEvents: NFTUpdatedEvent[] = []
function cancelPriceChange() { clearTimeout(priceTimer); priceTimer = undefined; scheduledPrice = false }
export const handlers = [
  http.get('/', () => passthrough()), socketHandler,
  route('post', '/api/reset', () => {
    cancelOrderTimers(); cancelPriceChange(); deferredNftEvents.length = 0; disconnectClients(0)
    clearAllAttempts(); localStorage.removeItem('kurio_session_token'); localStorage.removeItem('kurio_msw_scenario')
    db.reset()
    window.dispatchEvent(new Event('kurio:mocks-reset'))
    return HttpResponse.json({ success: true })
  }, false),
  route('post', '/api/scenario', async ({ request }) => {
    const data = object(await request.json())
    if (data.scenario && data.scenario !== 'default') localStorage.setItem('kurio_msw_scenario', text(data.scenario, 'Cenário'))
    else localStorage.removeItem('kurio_msw_scenario')
    cancelPriceChange()
    deferredNftEvents.length = 0
    return HttpResponse.json({ scenario: data.scenario || 'default' })
  }, false),
  route('get', '/api/scenario', ({ request }) => HttpResponse.json({ scenario: scenarioOf(request), socketReady: hasSocketClient(identity(request, false)) }), false),
  route('get', '/api/nfts', async ({ request }) => {

    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() || ''
    const collection = url.searchParams.get('collection') || ''
    const network = url.searchParams.get('network') || ''
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')
    const tab = url.searchParams.get('tab') || 'all'
    const sort = url.searchParams.get('sort') || 'recent'
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '8', 10))

    let filtered = [...db.getNFTs()]

    // Search filter
    if (search) {
      filtered = filtered.filter(
        (n) =>
          n.name.toLowerCase().includes(search) ||
          n.tokenId.toLowerCase().includes(search) ||
          n.collection.toLowerCase().includes(search) ||
          n.description.toLowerCase().includes(search)
      )
    }

    // Collection filter
    if (collection) {
      filtered = filtered.filter((n) => n.collection.toLowerCase() === collection.toLowerCase())
    }

    // Network filter
    if (network) {
      filtered = filtered.filter((n) => n.network.toLowerCase() === network.toLowerCase())
    }

    // Price range
    if (minPrice) {
      const min = parseEthToBigInt(minPrice)
      filtered = filtered.filter((n) => parseEthToBigInt(n.priceEth) >= min)
    }
    if (maxPrice) {
      const max = parseEthToBigInt(maxPrice)
      filtered = filtered.filter((n) => parseEthToBigInt(n.priceEth) <= max)
    }

    // Tabs
    if (tab === 'new') {
      filtered = filtered.filter((n) => n.isNew || n.isFeatured)
    } else if (tab === 'trending') {
      filtered = filtered.filter((n) => n.isTrending)
    }

    // Sorting
    if (sort === 'price_asc') {
      filtered.sort((a, b) => Number(parseEthToBigInt(a.priceEth) - parseEthToBigInt(b.priceEth)))
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => Number(parseEthToBigInt(b.priceEth) - parseEthToBigInt(a.priceEth)))
    } else {
      // recent
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    // Facet counts based on all NFTs
    const allNfts = db.getNFTs()
    const collectionMap: Record<string, number> = {}
    const networkMap: Record<string, number> = {}
    let minP: string | undefined
    let maxP: string | undefined

    allNfts.forEach((n) => {
      collectionMap[n.collection] = (collectionMap[n.collection] || 0) + 1
      networkMap[n.network] = (networkMap[n.network] || 0) + 1
      if (minP === undefined || parseEthToBigInt(n.priceEth) < parseEthToBigInt(minP)) minP = n.priceEth
      if (maxP === undefined || parseEthToBigInt(n.priceEth) > parseEthToBigInt(maxP)) maxP = n.priceEth
    })

    const total = filtered.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const items = filtered.slice(startIndex, startIndex + limit)

    return HttpResponse.json({
      items,
      total,
      page,
      limit,
      totalPages,
      collections: Object.entries(collectionMap).map(([name, count]) => ({ name, count })),
      networks: Object.entries(networkMap).map(([name, count]) => ({
        name: name as NetworkType,
        count,
      })),
      priceRange: {
        min: minP || '0.00',
        max: maxP || '0.00',
      },
    })
  }),

  route('get', '/api/nfts/:id', async ({ params }) => {

    const nft = db.getNFTById(params.id as string)
    if (!nft) {
      return HttpResponse.json({ message: 'NFT não encontrado' }, { status: 404 })
    }
    return HttpResponse.json(nft)
  }),

  route('post', '/api/auth/login', async ({ request }) => {
    const data = object(await request.json())
    const user = db.getUserByEmail(email(data.email))
    if (!user || typeof data.password !== 'string' || !await verifyPassword(data.password, user.passwordHash)) throw new ApiFailure('Credenciais inválidas. Verifique seu e-mail e senha.', 401)
    if (!user.passwordHash.startsWith('pbkdf2$')) db.changeUserPassword(user.id, await hashPassword(data.password))
    db.mergeGuestCartIntoUser(user.id)
    return HttpResponse.json({ ...db.createSession(user.id), user: publicUser(user) })
  }),
  route('post', '/api/auth/register', async ({ request }) => {
    const data = object(await request.json())
    const address = email(data.email), name = text(data.name, 'Nome completo'), secret = password(data.password)
    if (db.getUserByEmail(address)) throw new ApiFailure('Este endereço de e-mail já está cadastrado.', 409)
    const generated = address.split('@')[0].replace(/[^\p{L}\p{N}_.-]/gu, '_').padEnd(2, '_').slice(0, 32)
    let handle = username(data.username || generated)
    if (!data.username && db.getState().users.some(user => user.username.toLowerCase() === handle.toLowerCase())) handle = `${handle}_${crypto.randomUUID().slice(0, 6)}`
    if (db.getState().users.some(user => user.username.toLowerCase() === handle.toLowerCase())) throw new ApiFailure('Nome de usuário já está em uso.', 409)
    const user = db.createUser({ email: address, name, username: handle, passwordHash: await hashPassword(secret) })
    db.mergeGuestCartIntoUser(user.id)
    return HttpResponse.json({ ...db.createSession(user.id), user: publicUser(user) }, { status: 201 })
  }),
  route('get', '/api/auth/me', ({ request }) => {
    const user = db.getUserById(identity(request))
    if (!user) throw new ApiFailure('Sessão inválida.', 401)
    return HttpResponse.json({ user: publicUser(user), expiresAt: db.getSession(tokenOf(request))!.expiresAt })
  }),
  route('post', '/api/auth/logout', ({ request }) => { db.revokeSession(tokenOf(request)); disconnectClients(0); return HttpResponse.json({ success: true }) }, false),
  route('get', '/api/favorites', ({ request }) => HttpResponse.json(db.getFavorites(identity(request)).map(id => db.getNFTById(id)).filter(Boolean))),
  ...(['post', 'delete'] as const).map(method => route(method, '/api/favorites/:id', ({ request, params }) => {
    const userId = identity(request), id = String(params.id)
    if (!db.getNFTById(id)) throw new ApiFailure('NFT não encontrado.', 404)
    const has = db.getFavorites(userId).includes(id)
    if ((method === 'post' && !has) || (method === 'delete' && has)) db.toggleFavorite(userId, id)
    return HttpResponse.json({ isFavorite: method === 'post' })
  })),
  route('get', '/api/cart', ({ request }) => {
    const userId = identity(request, false), selected = db.getCart(userId), couponCode = db.getCartCoupon(userId)
    let couponError: string | undefined
    let quote: Pick<QuoteResponse, 'subtotalEth' | 'discountEth' | 'networkFeeEth' | 'totalEth'> & Partial<QuoteResponse>
    try { quote = selected.length ? calculateQuote(selected, 'Ethereum', couponCode) : { subtotalEth: '0.00', discountEth: '0.00', totalEth: '0.00', networkFeeEth: '0.016' } }
    catch (error) {
      if (!couponCode || !(error instanceof ApiFailure) || error.status !== 400) throw error
      couponError = error.message
      quote = { ...calculateQuote(selected, 'Ethereum'), valid: false }
    }
    return HttpResponse.json({ ...quote, items: selected, couponCode, couponError })
  }),
  route('post', '/api/cart/adjust-stock', ({ request }) => HttpResponse.json(db.adjustCartToStock(identity(request, false)))),
  route('post', '/api/cart/items', async ({ request }) => {
    const userId = identity(request, false), data = object(await request.json())
    const item = items([{ ...data, edition: data.edition || '1/50', quantity: data.quantity ?? 1 }])[0]
    const cart = db.getCart(userId), existing = cart.find(entry => entry.nftId === item.nftId && entry.edition === item.edition)
    if ((existing?.quantity || 0) + item.quantity > db.availableStock(item.nftId, item.edition)) throw new ApiFailure('Quantidade solicitada indisponível para esta edição.', 409)
    const total = cart.filter(entry => entry.nftId === item.nftId).reduce((sum, entry) => sum + entry.quantity, item.quantity)
    if (total > db.availableNFTStock(item.nftId)) throw new ApiFailure('Estoque total insuficiente.', 409)
    return HttpResponse.json(db.addToCart(userId, item.nftId, item.edition, item.quantity))
  }),
  route('patch', '/api/cart/items/:id', async ({ request, params }) => {
    const userId = identity(request, false), data = object(await request.json()), amount = quantity(data.quantity)
    const cart = db.getCart(userId), item = cart.find(entry => entry.id === params.id)
    if (!item) throw new ApiFailure('Item não encontrado.', 404)
    if (amount > db.availableStock(item.nftId, item.edition) || cart.filter(entry => entry.nftId === item.nftId && entry.id !== item.id).reduce((sum, entry) => sum + entry.quantity, amount) > db.availableNFTStock(item.nftId)) throw new ApiFailure('Quantidade solicitada indisponível para esta edição.', 409)
    return HttpResponse.json(db.updateCartItemQuantity(userId, item.id, amount))
  }),
  route('delete', '/api/cart/items/:id', ({ request, params }) => HttpResponse.json(db.removeFromCart(identity(request, false), String(params.id)))),
  route('put', '/api/cart/coupon', async ({ request }) => {
    const userId = identity(request, false), data = object(await request.json()), code = text(data.code, 'Cupom').toUpperCase()
    const cart = db.getCart(userId)
    if (!cart.length) throw new ApiFailure('Adicione um NFT antes de aplicar um cupom.')
    calculateQuote(cart, 'Ethereum', code)
    db.setCartCoupon(userId, code)
    return HttpResponse.json({ couponCode: code })
  }),
  route('delete', '/api/cart/coupon', ({ request }) => { db.setCartCoupon(identity(request, false), undefined); return HttpResponse.json({ success: true }) }),
  route('post', '/api/cart/quote', async ({ request }) => {
    identity(request, false)
    const data = object(await request.json())
    const quote = calculateQuote(items(data.items), network(data.network || 'Ethereum'), typeof data.couponCode === 'string' ? data.couponCode : undefined)
    if (scenarioOf(request) === 'price-changed' && !scheduledPrice) {
      scheduledPrice = true
      priceTimer = setTimeout(() => { db.updateNFTPriceAndStock('nft-1', '2.19', 12); publishNFT('nft-1'); priceTimer = undefined }, 700)
    }
    return HttpResponse.json(quote)
  }),
  route('post', '/api/orders', async ({ request }) => {
    const userId = identity(request), key = text(request.headers.get('Idempotency-Key'), 'Idempotency-Key')
    const exists = db.findOrderByKey(key)
    const order = createOrder(userId, key, await request.json(), scenarioOf(request))
    if (['timeout', 'timeout-idempotent'].includes(scenarioOf(request)) && !exists) { await delay(11000); return HttpResponse.error() }
    return HttpResponse.json(order, { status: exists ? 200 : 202 })
  }),
  route('get', '/api/orders', ({ request }) => HttpResponse.json(db.getOrdersByUser(identity(request)))),
  route('get', '/api/orders/by-key/:key', ({ request, params }) => {
    const userId = identity(request), record = db.findOrderByKey(String(params.key))
    if (!record || record.order.userId !== userId) throw new ApiFailure('Pedido não encontrado.', 404)
    return HttpResponse.json(record.order)
  }),
  route('get', '/api/orders/:id', ({ request, params }) => {
    const userId = identity(request), order = db.getOrderById(String(params.id))
    if (!order || order.userId !== userId) throw new ApiFailure('Pedido não encontrado.', 404)
    return HttpResponse.json(order)
  }),
  route('get', '/api/orders/:id/receipt', ({ request, params }) => {
    const userId = identity(request), order = db.getOrderById(String(params.id))
    if (!order || order.userId !== userId) throw new ApiFailure('Pedido não encontrado.', 404)
    if (order.status !== 'CONFIRMED' || !order.receipt) throw new ApiFailure('Recibo ainda não disponível.', 409)
    return HttpResponse.json({ orderId: order.id, orderNumber: order.orderNumber, items: order.items, receipt: order.receipt, totalEth: order.totalEth })
  }),
  route('get', '/api/profile', ({ request }) => HttpResponse.json(publicUser(db.getUserById(identity(request))!))),
  route('patch', '/api/profile', async ({ request }) => {
    const userId = identity(request), raw = object(await request.json()), data = profile(raw)
    let newHash: string | undefined
    if (raw.newPassword !== undefined) {
      const user = db.getUserById(userId)!
      if (typeof raw.currentPassword !== 'string' || !await verifyPassword(raw.currentPassword, user.passwordHash)) throw new ApiFailure('Senha atual incorreta.')
      newHash = await hashPassword(password(raw.newPassword))
    }
    if (data.username && db.getState().users.some(user => user.id !== userId && user.username.toLowerCase() === data.username!.toLowerCase())) throw new ApiFailure('Nome de usuário já está em uso.', 409)
    if (newHash) db.changeUserPassword(userId, newHash)
    return HttpResponse.json(publicUser(db.updateUserProfile(userId, data)!))
  }),
  route('post', '/api/profile/change-password', async ({ request }) => {
    const userId = identity(request), data = object(await request.json()), user = db.getUserById(userId)!
    if (typeof data.currentPassword !== 'string' || !await verifyPassword(data.currentPassword, user.passwordHash)) throw new ApiFailure('Senha atual incorreta.')
    db.changeUserPassword(userId, await hashPassword(password(data.newPassword)))
    return HttpResponse.json({ success: true })
  }),
  route('get', '/api/wallets', ({ request }) => HttpResponse.json(db.getWalletsByUser(identity(request)))),
  route('post', '/api/wallets', async ({ request }) => {
    const userId = identity(request), data = object(await request.json()), chain = network(data.network)
    const address = walletAddress(data.address, chain), label = text(data.label, 'Apelido da carteira')
    if (db.getWalletsByUser(userId).some(wallet => wallet.address.toLowerCase() === address.toLowerCase() && wallet.network === chain)) throw new ApiFailure('Esta carteira já está cadastrada.', 409)
    const metadata = walletMetadata(data.metadata)
    const wallet = db.createWallet(userId, address, chain, label)
    wallet.metadata = metadata; db.persistChanges()
    return HttpResponse.json(wallet, { status: 201 })
  }),
  route('patch', '/api/wallets/:id', async ({ request, params }) => {
    const userId = identity(request), current = db.getWalletsByUser(userId).find(wallet => wallet.id === params.id)
    if (!current) throw new ApiFailure('Carteira não encontrada.', 404)
    const data = object(await request.json()), chain = network(data.network || current.network)
    const address = walletAddress(data.address || current.address, chain)
    if (db.getWalletsByUser(userId).some(wallet => wallet.id !== current.id && wallet.address.toLowerCase() === address.toLowerCase() && wallet.network === chain)) throw new ApiFailure('Esta carteira já está cadastrada.', 409)
    return HttpResponse.json(db.updateWallet(current.id, userId, { address, network: chain, label: data.label === undefined ? current.label : text(data.label, 'Apelido'), isPrimary: data.isPrimary === true, metadata: walletMetadata(data.metadata) }))
  }),
  route('delete', '/api/wallets/:id', ({ request, params }) => {
    const userId = identity(request)
    if (!db.deleteWallet(String(params.id), userId)) throw new ApiFailure('Carteira não encontrada.', 404)
    const remaining = db.getWalletsByUser(userId)
    if (remaining.length && !remaining.some(wallet => wallet.isPrimary)) db.updateWallet(remaining[0].id, userId, { isPrimary: true })
    return HttpResponse.json({ success: true })
  }),
  route('post', '/api/wallets/:id/connect', async ({ request, params }) => {
    const userId = identity(request), wallet = db.getWalletsByUser(userId).find(entry => entry.id === params.id)
    if (!wallet) throw new ApiFailure('Carteira não encontrada.', 404)
    if (scenarioOf(request) === 'wallet-rejected') throw new ApiFailure('Conexão recusada na carteira simulada.', 409)
    const data = object(await request.json())
    const state = db.getState(); state.connections ??= {}; state.connections[userId] = { walletId: wallet.id, provider: text(data.provider || 'MetaMask', 'Provedor') }; db.persistChanges()
    return HttpResponse.json({ connected: true, walletId: wallet.id, network: wallet.network })
  }),
  route('post', '/api/wallets/disconnect', ({ request }) => { const id = identity(request); if (db.getState().connections) delete db.getState().connections![id]; db.persistChanges(); return HttpResponse.json({ connected: false }) }),
  route('post', '/api/scenario/events', async ({ request }) => {
    const data = object(await request.json())
    if (data.type === 'socket.disconnect') { disconnectClients(typeof data.durationMs === 'number' ? data.durationMs : 500); return HttpResponse.json({ success: true }) }
    if (data.type === 'nft.flush') { const pending = deferredNftEvents.splice(0); pending.forEach(broadcastNftUpdated); return HttpResponse.json({ success: true, count: pending.length }) }
    if (data.type === 'session.expire') { db.revokeSession(tokenOf(request)); return HttpResponse.json({ success: true }) }
    if (data.type === 'order.resolve') { const userId = identity(request); const order = db.getOrderById(text(data.id, 'Pedido')); if (!order || order.userId !== userId) throw new ApiFailure('Pedido não encontrado.', 404); settleOrder(order.id); return HttpResponse.json({ success: true }) }
    if (data.type === 'nft.updated') {
      const id = text(data.id, 'NFT'), nft = db.getNFTById(id)
      if (!nft) throw new ApiFailure('NFT não encontrado.', 404)
      const price = eth(data.priceEth ?? nft.priceEth), stock = data.availableQuantity === 0 ? 0 : quantity(data.availableQuantity ?? nft.availableQuantity)
      if (data.replay === true) broadcastNftUpdated({ eventId: crypto.randomUUID(), resourceId: id, priceEth: price, availableQuantity: stock, editionStock: nft.editionStock, version: typeof data.version === 'number' ? data.version : nft.version, timestamp: new Date().toISOString() })
      else {
        db.updateNFTPriceAndStock(id, price, stock)
        if (nft.editionStock) for (const key of Object.keys(nft.editionStock) as EditionType[]) nft.editionStock[key] = Math.min(stock, nft.editionStock[key] || 0)
        db.persistChanges()
        if (data.defer === true) { const event = nftUpdateEvent(id); if (event) deferredNftEvents.push(event) }
        else publishNFT(id)
      }
      return HttpResponse.json({ success: true })
    }
    if (data.type === 'order.replay') {
      const userId = identity(request), order = db.getOrderById(text(data.id, 'Pedido'))
      if (!order || order.userId !== userId) throw new ApiFailure('Pedido não encontrado.', 404)
      const event: OrderUpdatedEvent = { userId, eventId: crypto.randomUUID(), resourceId: order.id, status: 'PENDING', version: typeof data.version === 'number' ? data.version : order.version - 1, timestamp: new Date().toISOString() }
      broadcastOrderUpdated(event)
      return HttpResponse.json({ success: true })
    }
    throw new ApiFailure('Evento desconhecido.')
  }, false),
]
