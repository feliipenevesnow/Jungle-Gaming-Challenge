import { db } from './db'
import { calculateQuote, quoteSignature } from './quote'
import { broadcastNftUpdated, broadcastOrderUpdated } from './socket'
import { ApiFailure, email, items, network, object, text, username } from './validation'
import type { CreateOrderPayload, Order, OrderReceipt } from '@/types/api'

const timers = new Map<string, ReturnType<typeof setTimeout>>()
export function cancelOrderTimers() { timers.forEach(clearTimeout); timers.clear() }

export function nftUpdateEvent(id: string) {
  const nft = db.getNFTById(id)
  if (nft) return { eventId: crypto.randomUUID(), resourceId: id, version: nft.version, priceEth: nft.priceEth, availableQuantity: nft.availableQuantity, editionStock: nft.editionStock ? { ...nft.editionStock } : undefined, timestamp: new Date().toISOString() }
}
export function publishNFT(id: string) {
  const event = nftUpdateEvent(id)
  if (event) broadcastNftUpdated(event)
}

export function settleOrder(id: string) {
  const record = db.getState().orders.find(entry => entry.order.id === id)
  if (!record || record.order.status !== 'PENDING') return
  const order = record.order
  let outcome = record.outcome || 'CONFIRMED'
  if (order.items.some(item => !db.getNFTById(item.nftId) || db.availableStock(item.nftId, item.edition, id) < item.quantity)) outcome = 'REJECTED'
  let receipt: OrderReceipt | undefined
  if (outcome === 'CONFIRMED') {
    receipt = { transactionHash: `0x${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`, blockNumber: 19842100, explorerUrl: '#simulated', timestamp: new Date().toISOString(), payerWallet: order.walletAddress, network: order.network }
    for (const item of order.items) {
      const nft = db.getNFTById(item.nftId)!
      if (nft.editionStock) nft.editionStock[item.edition] = (nft.editionStock[item.edition] || 0) - item.quantity
      db.updateNFTPriceAndStock(nft.id, nft.priceEth, nft.availableQuantity - item.quantity)
    }
    db.clearPurchasedItemsFromCart(order.userId, order.items)
    db.setCartCoupon(order.userId, undefined)
  }
  db.updateOrderStatus(id, outcome, receipt)
  order.items.forEach(item => publishNFT(item.nftId))
  broadcastOrderUpdated({ userId: order.userId, eventId: crypto.randomUUID(), resourceId: id, status: outcome, version: order.version, receipt, timestamp: order.updatedAt })
  timers.delete(id)
}

export function resumeOrders() {
  for (const record of db.getState().orders) {
    if (record.order.status !== 'PENDING') continue
    const remaining = (record.resolveAt || Date.now()) - Date.now()
    if (remaining <= 0) settleOrder(record.order.id)
    else if (!timers.has(record.order.id)) timers.set(record.order.id, setTimeout(() => settleOrder(record.order.id), remaining))
  }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`
  return JSON.stringify(value)
}

export function createOrder(userId: string, key: string, raw: unknown, scenario: string): Order {
  const data = object(raw)
  const payload: CreateOrderPayload = { items: items(data.items), walletAddress: text(data.walletAddress, 'Carteira'), network: network(data.network), couponCode: typeof data.couponCode === 'string' ? data.couponCode : undefined, expectedTotalEth: typeof data.expectedTotalEth === 'string' ? data.expectedTotalEth : undefined, quoteSignature: typeof data.quoteSignature === 'string' ? data.quoteSignature : undefined, note: text(data.note, 'Observação', false) }
  if (data.collector === undefined) throw new ApiFailure('Preencha os dados do colecionador.')
  if (data.collector !== undefined) {
    const collector = object(data.collector)
    payload.collector = { displayName: text(collector.displayName, 'Nome de exibição'), username: username(collector.username), profileName: text(collector.profileName, 'Nome do perfil'), referralCode: text(collector.referralCode, 'Código de indicação'), ensName: text(collector.ensName, 'Nome ENS'), email: email(collector.email), walletType: text(collector.walletType, 'Tipo de carteira'), secondaryWallet: text(collector.secondaryWallet, 'Carteira secundária', false) }
  }
  const serialized = canonical(payload)
  const existing = db.findOrderByKey(key)
  if (existing) {
    if (existing.order.userId !== userId) throw new ApiFailure('Pedido não encontrado.', 404)
    if (existing.payloadString !== serialized) throw new ApiFailure('A chave de idempotência foi reutilizada com dados diferentes.', 409)
    return existing.order
  }
  if (!db.getWalletsByUser(userId).some(wallet => wallet.address === payload.walletAddress && wallet.network === payload.network)) throw new ApiFailure('Selecione uma carteira cadastrada na rede escolhida.')
  if (db.getState().connections?.[userId]?.walletId !== db.getWalletsByUser(userId).find(wallet => wallet.address === payload.walletAddress && wallet.network === payload.network)?.id) throw new ApiFailure('Conecte sua carteira antes de confirmar.')
  const quote = calculateQuote(payload.items, payload.network, payload.couponCode)
  if (!quote.valid) throw new ApiFailure(quote.warnings?.join(' ') || 'Estoque insuficiente.', 409)
  if ((payload.expectedTotalEth && payload.expectedTotalEth !== quote.totalEth) || (payload.quoteSignature && payload.quoteSignature !== quoteSignature(quote))) throw new ApiFailure('A cotação mudou. Revise os valores e confirme novamente.', 409)
  const timestamp = new Date().toISOString()
  const order: Order = { id: `order-${crypto.randomUUID()}`, orderNumber: `KUR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, userId, idempotencyKey: key, collector: payload.collector, note: payload.note, status: 'PENDING', items: payload.items.map(item => { const nft = db.getNFTById(item.nftId)!; const priced = quote.items.find(entry => entry.nftId === item.nftId && entry.edition === item.edition)!; return { ...item, name: nft.name, tokenId: nft.tokenId, imageUrl: nft.imageUrl, unitPriceEth: nft.priceEth, subtotalEth: priced.totalEth } }), subtotalEth: quote.subtotalEth, discountEth: quote.discountEth, networkFeeEth: quote.networkFeeEth, totalEth: quote.totalEth, couponCode: payload.couponCode, walletAddress: payload.walletAddress, network: payload.network, createdAt: timestamp, updatedAt: timestamp, version: 1 }
  db.saveOrder(key, serialized, order)
  const record = db.findOrderByKey(key)!
  record.resolveAt = Date.now() + (scenario === 'order-pending' ? 5000 : 900)
  record.outcome = scenario === 'payment-rejected' ? 'REJECTED' : 'CONFIRMED'
  db.persistChanges()
  resumeOrders()
  return order
}
