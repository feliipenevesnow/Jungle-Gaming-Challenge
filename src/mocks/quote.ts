import { addEth, applyPercentageDiscount } from '@/lib/decimal'
import type { NetworkType, QuoteRequest, QuoteResponse } from '@/types/api'
import { multiplyEth } from '@/lib/decimal'
import { db } from './db'
import { ApiFailure } from './validation'

export function calculateQuote(items: QuoteRequest['items'], chain: NetworkType, couponCode?: string): QuoteResponse {
  let subtotalEth = '0.00'
  const warnings: string[] = []
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.nftId, (totals.get(item.nftId) || 0) + item.quantity)
  const validated = items.map(item => {
    const nft = db.getNFTById(item.nftId)
    if (!nft) throw new ApiFailure('NFT não encontrado.', 404)
    const currentStock = db.availableStock(item.nftId, item.edition)
    const available = item.quantity <= currentStock && (totals.get(nft.id) || 0) <= db.availableNFTStock(nft.id)
    if (!available) warnings.push(`O item ${nft.name}, edição ${item.edition}, tem apenas ${currentStock} unidades disponíveis.`)
    const totalEth = multiplyEth(nft.priceEth, item.quantity)
    subtotalEth = addEth(subtotalEth, totalEth)
    return { nftId: nft.id, edition: item.edition, name: nft.name, unitPriceEth: nft.priceEth, quantity: item.quantity, totalEth, available, currentStock, version: nft.version }
  })
  const coupon = couponCode ? db.getCoupon(couponCode) : undefined
  if (couponCode && (!coupon || !coupon.isActive || new Date(coupon.expiresAt).getTime() <= Date.now())) throw new ApiFailure('Cupom de desconto inválido ou expirado.')
  const { discountEth, finalEth } = applyPercentageDiscount(subtotalEth, coupon?.discountPercent || 0)
  const networkFeeEth = chain === 'Ethereum' ? '0.016' : chain === 'Polygon' ? '0.001' : '0.002'
  return { valid: !warnings.length, subtotalEth, discountEth, networkFeeEth, totalEth: addEth(finalEth, networkFeeEth, 3), items: validated, warnings: warnings.length ? warnings : undefined, couponApplied: coupon ? { code: coupon.code, discountPercent: coupon.discountPercent, description: coupon.description } : undefined }
}

export function quoteSignature(quote: QuoteResponse): string { return JSON.stringify(quote) }
