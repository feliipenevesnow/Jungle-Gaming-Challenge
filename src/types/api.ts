export type NetworkType = 'Ethereum' | 'Polygon' | 'Solana'

export type EditionType = '1/1' | '1/10' | '1/50' | 'ABERTA'

export interface NFTAttribute {
  trait_type: string
  value: string
}

export interface NFT {
  id: string
  tokenId: string
  name: string
  collection: string
  priceEth: string // Decimal string to avoid float imprecision (e.g., "1.190")
  originalPriceEth?: string // Optional original price for discounted NFTs (e.g., "2.290")
  imageUrl: string
  detailImageUrl?: string
  thumbnails?: string[]
  description: string
  about: string
  network: NetworkType
  contractAddress: string
  creatorAddress: string
  creatorRoyaltyPercent: number
  edition: EditionType
  totalQuantity: number
  availableQuantity: number
  editionStock?: Partial<Record<EditionType, number>>
  rating: number
  reviewsCount: number
  badge?: string
  attributes: NFTAttribute[]

  isFeatured?: boolean
  isNew?: boolean
  isTrending?: boolean
  createdAt: string
  version: number
}

export interface User {
  id: string
  email: string
  name: string
  username: string
  avatarUrl: string
  bio?: string
  ensName?: string
  walletNickname?: string
  createdAt: string
}

export interface Session {
  user: User
  token: string
  expiresAt: string
}

export type AuthResponse = Session

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}


export interface Wallet {
  id: string
  userId: string
  address: string
  network: NetworkType
  label: string
  isPrimary: boolean
  balanceEth: string
  metadata?: { displayName: string; profileName: string; secondaryEns: string; walletType: string; referralCode: string; ensName: string }
}

export interface CartItem {
  id: string
  nftId: string
  nft: NFT
  edition: EditionType
  quantity: number
  priceEth: string
  subtotalEth: string
}

export interface CartState {
  couponError?: string
  items: CartItem[]
  couponCode?: string
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  appliedDiscountPercent?: number
}

export interface QuoteRequest {
  items: {
    nftId: string
    quantity: number
    edition: EditionType
  }[]
  couponCode?: string
  network?: NetworkType
}

export interface QuoteResponse {
  valid: boolean
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponApplied?: {
    code: string
    discountPercent: number
    description: string
  }
  items: {
    nftId: string
    edition?: EditionType
    version?: number
    name: string
    unitPriceEth: string
    quantity: number
    totalEth: string
    available: boolean
    currentStock: number
  }[]
  warnings?: string[]
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED'

export interface OrderItem {
  tokenId?: string
  nftId: string
  name: string
  imageUrl: string
  edition: EditionType
  quantity: number
  unitPriceEth: string
  subtotalEth: string
}

export interface OrderReceipt {
  transactionHash: string
  blockNumber: number
  explorerUrl: string
  timestamp: string
  payerWallet: string
  network: NetworkType
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  idempotencyKey: string
  collector?: CreateOrderPayload['collector']
  note?: string
  status: OrderStatus
  items: OrderItem[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode?: string
  walletAddress: string
  network: NetworkType
  createdAt: string
  updatedAt: string
  receipt?: OrderReceipt
  version: number
}

export interface CreateOrderPayload {
  expectedTotalEth?: string
  items: {
    nftId: string
    quantity: number
    edition: EditionType
  }[]
  walletAddress: string
  network: NetworkType
  couponCode?: string
  collector?: { displayName: string; username: string; profileName: string; referralCode: string; ensName: string; email: string; walletType: string; secondaryWallet?: string }
  note?: string
  quoteSignature?: string
}

export interface NFTUpdatedEvent {
  eventId: string
  resourceId: string
  version: number
  priceEth: string
  availableQuantity: number
  editionStock?: Partial<Record<EditionType, number>>
  timestamp: string
}

export interface OrderUpdatedEvent {
  userId: string
  eventId: string
  resourceId: string
  version: number
  status: OrderStatus
  receipt?: OrderReceipt
  timestamp: string
}

export interface NFTSearchParams {
  search?: string
  collection?: string
  network?: string
  minPrice?: string
  maxPrice?: string
  tab?: 'all' | 'new' | 'trending'
  sort?: 'recent' | 'price_asc' | 'price_desc'
  page?: number
  limit?: number
}

export interface NFTListResponse {
  items: NFT[]
  total: number
  page: number
  limit: number
  totalPages: number
  collections: { name: string; count: number }[]
  networks: { name: NetworkType; count: number }[]
  priceRange: { min: string; max: string }
}
