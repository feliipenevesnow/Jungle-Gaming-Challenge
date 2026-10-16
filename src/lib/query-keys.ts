import type { NFTSearchParams, QuoteRequest } from '@/types/api'

// Resource prefixes are stable so mutations and socket reconciliation can
// invalidate a family. Private records always include their owner.
export const keys = {
  session: (token: string | null) => ['session', token] as const,
  nfts: (params: NFTSearchParams) => ['nfts', params] as const,
  nft: (id: string) => ['nft', id] as const,
  cart: (userId?: string) => ['cart', userId || 'guest'] as const,
  cartQuote: (userId: string | undefined, items: QuoteRequest['items'], coupon?: string) => ['cart-quote', userId || 'guest', items, coupon] as const,
  checkoutQuote: (userId: string | undefined, request: QuoteRequest) => ['checkout-quote', userId, request] as const,
  wallets: (userId?: string) => ['wallets', userId] as const,
  profile: (userId?: string) => ['profile', userId] as const,
  favorites: (userId?: string) => ['favorites', userId] as const,
  order: (userId: string | undefined, id: string) => ['order', userId, id] as const,
  attempt: (userId: string | undefined, id?: string) => ['orders', userId, 'attempt', id] as const,
}
