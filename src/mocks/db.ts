import type {
  NFT,
  User,
  Wallet,
  CartItem,
  Order,
  EditionType,
  NetworkType,
} from '@/types/api'
import { multiplyEth } from '@/lib/decimal'

export interface Coupon {
  code: string
  discountPercent: number
  description: string
  expiresAt: string
  isActive: boolean
}

export interface StoredOrderRecord {
  idempotencyKey: string
  payloadString: string
  order: Order
  resolveAt?: number
  outcome?: 'CONFIRMED' | 'REJECTED'
}

export interface MockDatabaseState {
  nfts: NFT[]
  users: (User & { passwordHash: string })[]
  wallets: Wallet[]
  favoritesByUser: Record<string, string[]> // userId -> nftIds[]
  cartByUser: Record<string, CartItem[]> // userId -> CartItem[]
  orders: StoredOrderRecord[]
  coupons: Coupon[]
  couponByUser?: Record<string, string>
  connections?: Record<string, { walletId: string; provider: string }>
  sessions?: Record<string, { userId: string; expiresAt: string }>
}

const STORAGE_KEY = 'kurio_mock_database_v2'

export const SEED_NFTS: NFT[] = [
  {
    id: 'nft-1',
    tokenId: '#0042',
    name: 'Emerald Ape #042',
    collection: 'Arte digital',
    priceEth: '1.19',
    imageUrl: '/assets/images/emerald-ape.webp',
    detailImageUrl: '/assets/images/detail-main.webp',
    thumbnails: [
      '/assets/images/detail-thumb-1.webp',
      '/assets/images/detail-thumb-2.webp',
      '/assets/images/detail-thumb-3.webp',
      '/assets/images/detail-thumb-4.webp',
    ],
    description: 'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
    about: 'Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.',
    network: 'Ethereum',
    contractAddress: '0x7A42b109e23891cF3809C88e19E87042B099',
    creatorAddress: '0x992B1089201D8A4C2E910B89C2341991',
    creatorRoyaltyPercent: 5,
    edition: '1/50',
    totalQuantity: 50,
    availableQuantity: 12,
    rating: 5,
    reviewsCount: 19,
    attributes: [
      { trait_type: 'Óculos', value: 'Esmeralda' },
      { trait_type: 'Raridade', value: 'Raro' },
      { trait_type: 'Fundo', value: 'Dark Ink' },
    ],
    isFeatured: true,
    isTrending: true,
    createdAt: '2026-09-29T10:00:00Z',
    version: 1,
  },
  {
    id: 'nft-2',
    tokenId: '#0009',
    name: 'Sage Nomad #009',
    collection: 'Arte digital',
    priceEth: '1.69',
    imageUrl: '/assets/images/sage-nomad.webp',
    description: 'Exploração visual de paisagens sintéticas e viajantes no ciberespaço.',
    about: 'Sage Nomad #009 representa os pioneiros da arte descentralizada, gravado permanentemente na rede Ethereum.',
    network: 'Ethereum',
    contractAddress: '0x7A42b109e23891cF3809C88e19E87042B099',
    creatorAddress: '0x992B1089201D8A4C2E910B89C2341991',
    creatorRoyaltyPercent: 5,
    edition: '1/10',
    totalQuantity: 10,
    availableQuantity: 4,
    rating: 4.8,
    reviewsCount: 14,
    attributes: [
      { trait_type: 'Traje', value: 'Nômade' },
      { trait_type: 'Raridade', value: 'Épico' },
    ],
    isNew: true,
    createdAt: '2026-09-28T11:00:00Z',
    version: 1,
  },
  {
    id: 'nft-3',
    tokenId: '#0552',
    name: 'Neon Vessel #552',
    collection: 'Arte 3D',
    priceEth: '1.99',
    originalPriceEth: '2.29',
    badge: 'RARO',
    imageUrl: '/assets/images/neon-vessel.webp',

    description: 'Escultura tridimensional em luz holográfica e renderização volumétrica.',
    about: 'Estrutura geométrica complexa renderizada em GPU distribuída com paleta neon e texturas reflexivas.',
    network: 'Polygon',
    contractAddress: '0x3F23199B9C490D9981A4C2E910B89C234188',
    creatorAddress: '0x881C29019A8201D8A4C2E910B89C2341992',
    creatorRoyaltyPercent: 5,
    edition: '1/50',
    totalQuantity: 50,
    availableQuantity: 8,
    rating: 4.9,
    reviewsCount: 27,
    attributes: [
      { trait_type: 'Forma', value: 'Cúbica' },
      { trait_type: 'Iluminação', value: 'Neon Dourado' },
    ],
    isTrending: true,
    createdAt: '2026-09-27T12:00:00Z',
    version: 1,
  },
  {
    id: 'nft-4',
    tokenId: '#0118',
    name: 'Cosmic Bloom #118',
    collection: 'Generativa',
    priceEth: '1.29',
    imageUrl: '/assets/images/cosmic-bloom.webp',
    description: 'Algoritmo de crescimento fractal orgânico simulado matematicamente.',
    about: 'Cada pétala é governada por equações diferenciais não-lineares calculadas diretamente no bloco.',
    network: 'Solana',
    contractAddress: '0x55321F9A8201D8A4C2E910B89C2341993',
    creatorAddress: '0x772A1089201D8A4C2E910B89C2341994',
    creatorRoyaltyPercent: 5,
    edition: 'ABERTA',
    totalQuantity: 100,
    availableQuantity: 50,
    rating: 4.7,
    reviewsCount: 11,
    attributes: [
      { trait_type: 'Algoritmo', value: 'Mandelbrot 3D' },
      { trait_type: 'Geração', value: '001' },
    ],
    isNew: true,
    createdAt: '2026-09-26T13:00:00Z',
    version: 1,
  },
  {
    id: 'nft-5',
    tokenId: '#0314',
    name: 'Violet Nomad #314',
    collection: 'Arte digital',
    priceEth: '1.39',
    imageUrl: '/assets/images/violet-nomad.webp',
    description: 'Estudo em tons violetas e iluminação cinematográfica do universo Kurio.',
    about: 'Segunda geração da série de nômades estelares com pintura digital de alta fidelidade.',
    network: 'Ethereum',
    contractAddress: '0x7A42b109e23891cF3809C88e19E87042B099',
    creatorAddress: '0x992B1089201D8A4C2E910B89C2341991',
    creatorRoyaltyPercent: 5,
    edition: '1/10',
    totalQuantity: 10,
    availableQuantity: 10,
    rating: 4.8,
    reviewsCount: 15,
    attributes: [
      { trait_type: 'Cor', value: 'Violeta' },
      { trait_type: 'Raridade', value: 'Épico' },
    ],
    createdAt: '2026-09-25T14:00:00Z',
    version: 1,
  },
  {
    id: 'nft-6',
    tokenId: '#0088',
    name: 'Ivory Baron #088',
    collection: 'Colecionáveis',
    priceEth: '1.79',
    imageUrl: '/assets/images/ivory-baron.webp',
    description: 'Retrato nobre em texturas de marfim e detalhes polidos à mão.',
    about: 'Colecionável nobre da dinastia Kurio, concedendo acesso vitalício ao lounge de colecionadores.',
    network: 'Polygon',
    contractAddress: '0x3F23199B9C490D9981A4C2E910B89C234188',
    creatorAddress: '0x881C29019A8201D8A4C2E910B89C2341992',
    creatorRoyaltyPercent: 5,
    edition: '1/50',
    totalQuantity: 50,
    availableQuantity: 18,
    rating: 5,
    reviewsCount: 32,
    attributes: [
      { trait_type: 'Status', value: 'Barão' },
      { trait_type: 'Material', value: 'Marfim' },
    ],
    isTrending: true,
    createdAt: '2026-09-24T15:00:00Z',
    version: 1,
  },
  {
    id: 'nft-7',
    tokenId: '#0207',
    name: 'Golden Beat #207',
    collection: 'Música',
    priceEth: '0.99',
    imageUrl: '/assets/images/golden-beat.webp',
    description: 'Trilha sonora original sintética com direitos de master e arquivo de áudio WAV.',
    about: 'Composição musical procedural em 128 BPM sincronizada com visualizador de frequências gravado no NFT.',
    network: 'Ethereum',
    contractAddress: '0x7A42b109e23891cF3809C88e19E87042B099',
    creatorAddress: '0x661A1089201D8A4C2E910B89C2341995',
    creatorRoyaltyPercent: 5,
    edition: '1/50',
    totalQuantity: 50,
    availableQuantity: 9,
    rating: 4.6,
    reviewsCount: 8,
    attributes: [
      { trait_type: 'BPM', value: '128' },
      { trait_type: 'Gênero', value: 'Synthwave' },
    ],
    createdAt: '2026-09-23T16:00:00Z',
    version: 1,
  },
  {
    id: 'nft-8',
    tokenId: '#0160',
    name: 'Golden Signal #160',
    collection: 'Fotografia',
    priceEth: '0.39',
    imageUrl: '/assets/images/golden-signal.webp',
    description: 'Fotografia de longa exposição capturada em paisagem industrial noturna.',
    about: 'Série documental fotográfica em suporte analógico de 35mm digitalizada em 8K sem compressão.',
    network: 'Solana',
    contractAddress: '0x55321F9A8201D8A4C2E910B89C2341993',
    creatorAddress: '0x551A1089201D8A4C2E910B89C2341996',
    creatorRoyaltyPercent: 5,
    edition: 'ABERTA',
    totalQuantity: 100,
    availableQuantity: 25,
    rating: 4.5,
    reviewsCount: 7,
    attributes: [
      { trait_type: 'Exposição', value: '30s' },
      { trait_type: 'Lente', value: '50mm' },
    ],
    createdAt: '2026-09-22T17:00:00Z',
    version: 1,
  },
  {
    id: 'nft-9',
    tokenId: '#0701',
    name: 'Cyber Relic #701',
    collection: 'Jogos',
    priceEth: '2.45',
    imageUrl: '/assets/images/cyber-relic.webp',
    description: 'Artefato utilizável em metaversos compatíveis com motor Unreal Engine 5.',
    about: 'Item único lendário com metadados 3D GLTF desbloqueáveis para avatares e jogos web3.',
    network: 'Ethereum',
    contractAddress: '0x7A42b109e23891cF3809C88e19E87042B099',
    creatorAddress: '0x992B1089201D8A4C2E910B89C2341991',
    creatorRoyaltyPercent: 10,
    edition: '1/1',
    totalQuantity: 1,
    availableQuantity: 1,
    rating: 5,
    reviewsCount: 40,
    attributes: [
      { trait_type: 'Classe', value: 'Relíquia' },
      { trait_type: 'Motor', value: 'Unreal 5' },
    ],
    isFeatured: true,
    isTrending: true,
    createdAt: '2026-09-21T18:00:00Z',
    version: 1,
  },
  {
    id: 'nft-10',
    tokenId: '#0001',
    name: 'Genesis Key #001',
    collection: 'Assinaturas',
    priceEth: '3.50',
    imageUrl: '/assets/images/promo-genesis.webp',
    description: 'Chave fundadora garantindo acesso antecipado a todos os lançamentos futuros da Kurio.',
    about: 'Passe perpétuo da plataforma Kurio Editions, gravado no contrato oficial ERC-721.',
    network: 'Ethereum',
    contractAddress: '0x7A42b109e23891cF3809C88e19E87042B099',
    creatorAddress: '0x140D0A201D8A4C2E910B89C2341990',
    creatorRoyaltyPercent: 0,
    edition: '1/10',
    totalQuantity: 10,
    availableQuantity: 3,
    rating: 5,
    reviewsCount: 22,
    attributes: [
      { trait_type: 'Nível', value: 'Gênesis' },
      { trait_type: 'Privilégio', value: 'VIP' },
    ],
    isNew: true,
    createdAt: '2026-09-20T19:00:00Z',
    version: 1,
  },
  {
    id: 'nft-11',
    tokenId: '#0012',
    name: 'Utility Pass #012',
    collection: 'Utilidade',
    priceEth: '0.75',
    imageUrl: '/assets/images/promo-curated.webp',
    description: 'Ticket de descontos e isenção de taxas na rede Polygon para o ano de 2026.',
    about: 'Token utilitário com validade permanente e staking ativado no protocolo de governança.',
    network: 'Polygon',
    contractAddress: '0x3F23199B9C490D9981A4C2E910B89C234188',
    creatorAddress: '0x140D0A201D8A4C2E910B89C2341990',
    creatorRoyaltyPercent: 2.5,
    edition: 'ABERTA',
    totalQuantity: 80,
    availableQuantity: 35,
    rating: 4.8,
    reviewsCount: 19,
    attributes: [
      { trait_type: 'Taxa Zero', value: 'Sim' },
      { trait_type: 'Rede', value: 'Polygon' },
    ],
    createdAt: '2026-09-19T20:00:00Z',
    version: 1,
  },
  {
    id: 'nft-12',
    tokenId: '#0388',
    name: 'Astral Nomad #388',
    collection: 'Arte 3D',
    priceEth: '2.10',
    imageUrl: '/assets/images/featured-banner.webp',
    description: 'Edição limitada em destaque de viajante dimensional.',
    about: 'Composição de iluminação volumétrica e vestimenta cerimonial em alta resolução.',
    network: 'Ethereum',
    contractAddress: '0x7A42b109e23891cF3809C88e19E87042B099',
    creatorAddress: '0x992B1089201D8A4C2E910B89C2341991',
    creatorRoyaltyPercent: 5,
    edition: '1/10',
    totalQuantity: 10,
    availableQuantity: 1,
    rating: 5,
    reviewsCount: 18,
    attributes: [
      { trait_type: 'Série', value: 'Astral' },
      { trait_type: 'Raridade', value: 'Mítico' },
    ],
    isFeatured: true,
    createdAt: '2026-09-18T21:00:00Z',
    version: 1,
  },
]

export const SEED_USERS = [
  {
    id: 'user-alex',
    email: 'alex@kurio.art',
    name: 'Alex Vance',
    username: '@alex_collector',
    avatarUrl: '/assets/images/emerald-ape.webp',
    bio: 'Colecionador de arte generativa e nômades digitais desde 2021.',
    passwordHash: 'pbkdf2$kurio-demo$5027b5c2ca38c0c7cbe1132ee3cd52b83a1cc44580f3a7af35f1f15e29b01fa8',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'user-sofia',
    email: 'sofia@kurio.art',
    name: 'Sofia Silva',
    username: '@sofia_creator',
    avatarUrl: '/assets/images/sage-nomad.webp',
    bio: 'Artista digital 3D e exploradora visual na rede Ethereum.',
    passwordHash: 'pbkdf2$kurio-demo$5027b5c2ca38c0c7cbe1132ee3cd52b83a1cc44580f3a7af35f1f15e29b01fa8',
    createdAt: '2026-02-20T10:00:00Z',
  },
]

export const SEED_WALLETS: Wallet[] = [
  {
    id: 'wallet-1',
    userId: 'user-alex',
    address: '0x1A2B3C4D5E6F708192A3B4C5D6E7F8091A2B3C4D',
    network: 'Ethereum',
    label: 'Carteira Principal (MetaMask)',
    isPrimary: true,
    balanceEth: '14.85',
  },
  {
    id: 'wallet-2',
    userId: 'user-alex',
    address: '0x9E8F7A6B5C4D3E2F10A9B8C7D6E5F40312A3B4C5',
    network: 'Polygon',
    label: 'Carteira Secundária (Polygon)',
    isPrimary: false,
    balanceEth: '3.40',
  },
  {
    id: 'wallet-3',
    userId: 'user-sofia',
    address: '0x5F6E7D8C9B0A1F2E3D4C5B6A7F8E9D0C1B2A3F4E',
    network: 'Ethereum',
    label: 'Carteira Artista (Coinbase)',
    isPrimary: true,
    balanceEth: '8.20',
  },
]

export const SEED_COUPONS: Coupon[] = [
  {
    code: 'KURIO10',
    discountPercent: 10,
    description: '10% de desconto em todo o catálogo',
    expiresAt: '2026-12-31T23:59:59Z',
    isActive: true,
  },
  {
    code: 'WELCOME20',
    discountPercent: 20,
    description: '20% de boas-vindas para novos membros',
    expiresAt: '2026-12-31T23:59:59Z',
    isActive: true,
  },
  {
    code: 'EXPIRED50',
    discountPercent: 50,
    description: 'Cupom de 50% expirado para teste de erro',
    expiresAt: '2025-01-01T00:00:00Z',
    isActive: false,
  },
]

function safeGetLocalStorage(key: string): string | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null
  }
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore storage quota errors
  }
}

function safeRemoveLocalStorage(key: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return
  }
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore
  }
}

function getInitialState(): MockDatabaseState {
  try {
    const raw = safeGetLocalStorage(STORAGE_KEY)
    if (raw) {
      const saved: MockDatabaseState = JSON.parse(raw)
      // Older installations already have this storage key but predate detail metadata.
      // Restore only missing metadata for known fixtures; never reset user state,
      // prices, stock, editions, carts or immutable order snapshots.
      let migrated = false
      const nfts = saved.nfts.map(nft => {
        const seed = SEED_NFTS.find(item => item.id === nft.id)
        if (!seed) return nft
        const metadata = {
          contractAddress: seed.contractAddress,
          creatorAddress: seed.creatorAddress,
          creatorRoyaltyPercent: seed.creatorRoyaltyPercent,
          about: seed.about,
          attributes: seed.attributes,
          thumbnails: seed.thumbnails,
          detailImageUrl: seed.detailImageUrl,
        }
        const missing = Object.fromEntries(Object.entries(metadata).filter(([key, value]) =>
          nft[key as keyof NFT] === undefined && value !== undefined,
        ))
        if (Object.keys(missing).length === 0) return nft
        migrated = true
        return { ...nft, ...missing }
      })
      if (!migrated) return saved
      const restored = { ...saved, nfts }
      safeSetLocalStorage(STORAGE_KEY, JSON.stringify(restored))
      return restored
    }
  } catch (err) {
    console.warn('Error reading from localStorage:', err)
  }

  return {
    nfts: structuredClone(SEED_NFTS),
    users: structuredClone(SEED_USERS),
    wallets: structuredClone(SEED_WALLETS),
    favoritesByUser: {
      'user-alex': ['nft-1', 'nft-3'],
      'user-sofia': ['nft-2'],
    },
    cartByUser: {
      'user-alex': [
        {
          id: 'cart-item-1',
          nftId: 'nft-1',
          nft: SEED_NFTS[0],
          edition: '1/50',
          quantity: 2,
          priceEth: '1.19',
          subtotalEth: '2.38',
        },
        {
          id: 'cart-item-2',
          nftId: 'nft-5',
          nft: SEED_NFTS[4],
          edition: '1/10',
          quantity: 6,
          priceEth: '1.39',
          subtotalEth: '8.34',
        },
        {
          id: 'cart-item-3',
          nftId: 'nft-6',
          nft: SEED_NFTS[5],
          edition: '1/50',
          quantity: 9,
          priceEth: '1.79',
          subtotalEth: '16.11',
        },
      ],
      guest: [
        {
          id: 'cart-item-1',
          nftId: 'nft-1',
          nft: SEED_NFTS[0],
          edition: '1/50',
          quantity: 2,
          priceEth: '1.19',
          subtotalEth: '2.38',
        },
        {
          id: 'cart-item-2',
          nftId: 'nft-5',
          nft: SEED_NFTS[4],
          edition: '1/10',
          quantity: 6,
          priceEth: '1.39',
          subtotalEth: '8.34',
        },
        {
          id: 'cart-item-3',
          nftId: 'nft-6',
          nft: SEED_NFTS[5],
          edition: '1/50',
          quantity: 9,
          priceEth: '1.79',
          subtotalEth: '16.11',
        },
      ],
    },
    orders: [],
    coupons: SEED_COUPONS,
  }
}

class MockDatabase {
  private state: MockDatabaseState

  constructor() {
    this.state = getInitialState()
    this.prepareEditions()
  }

  private prepareEditions() {
    for (const nft of this.state.nfts) {
      nft.editionStock ??= { [nft.edition]: nft.availableQuantity }
      if (nft.id === 'nft-1') nft.editionStock = { '1/1': 0, '1/10': 4, ABERTA: 8, ...nft.editionStock }
    }
  }

  createSession(userId: string) {
    const token = `session-${crypto.randomUUID()}`
    const session = { userId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
    this.state.sessions ??= {}
    this.state.sessions[token] = session
    this.persist()
    return { token, expiresAt: session.expiresAt }
  }

  getSession(token: string) {
    const session = this.state.sessions?.[token]
    if (!session || !this.getUserById(session.userId) || new Date(session.expiresAt).getTime() <= Date.now()) return undefined
    return session
  }

  revokeSession(token: string) {
    const userId = this.state.sessions?.[token]?.userId
    if (userId && this.state.connections) delete this.state.connections[userId]
    if (this.state.sessions) delete this.state.sessions[token]
    this.persist()
  }

  availableNFTStock(nftId: string, ignoreOrder?: string) {
    const nft = this.getNFTById(nftId)
    if (!nft) return 0
    const reserved = this.state.orders.filter(record => record.order.status === 'PENDING' && record.order.id !== ignoreOrder)
      .flatMap(record => record.order.items).filter(item => item.nftId === nftId)
      .reduce((sum, item) => sum + item.quantity, 0)
    return Math.max(0, nft.availableQuantity - reserved)
  }

  availableStock(nftId: string, edition: EditionType, ignoreOrder?: string) {
    const nft = this.getNFTById(nftId)
    if (!nft) return 0
    const pending = this.state.orders.filter(record => record.order.status === 'PENDING' && record.order.id !== ignoreOrder).flatMap(record => record.order.items).filter(item => item.nftId === nftId)
    const editionReserved = pending.filter(item => item.edition === edition).reduce((sum, item) => sum + item.quantity, 0)
    return Math.max(0, Math.min(this.availableNFTStock(nftId, ignoreOrder), (nft.editionStock?.[edition] ?? 0) - editionReserved))
  }

  adjustCartToStock(userId: string) {
    const remaining = new Map<string, number>()
    this.state.cartByUser[userId] = this.getCart(userId).flatMap(item => {
      const total = remaining.get(item.nftId) ?? this.availableNFTStock(item.nftId)
      const amount = Math.min(item.quantity, this.availableStock(item.nftId, item.edition), total)
      remaining.set(item.nftId, total - amount)
      return amount > 0 ? [{ ...item, quantity: amount, subtotalEth: multiplyEth(item.priceEth, amount) }] : []
    })
    this.persist()
    return this.state.cartByUser[userId]
  }

  persistChanges() { this.persist() }

  private persist() {
    safeSetLocalStorage(STORAGE_KEY, JSON.stringify(this.state))
  }

  reset() {
    safeRemoveLocalStorage(STORAGE_KEY)
    this.state = getInitialState()
    this.prepareEditions()
    this.persist()
    console.log('[MockDatabase] State successfully reset to defaults.')
  }


  getState(): MockDatabaseState {
    return this.state
  }

  // NFTs
  getNFTs(): NFT[] {
    return this.state.nfts
  }

  getNFTById(id: string): NFT | undefined {
    return this.state.nfts.find((n) => n.id === id || n.tokenId === id)
  }

  updateNFTPriceAndStock(id: string, newPriceEth: string, newStock: number): NFT | null {
    const nft = this.getNFTById(id)
    if (!nft) return null
    nft.priceEth = newPriceEth
    nft.availableQuantity = newStock
    nft.version += 1
    this.persist()
    return nft
  }

  // Users & Auth
  getUserById(id: string) {
    return this.state.users.find((u) => u.id === id)
  }

  getUserByEmail(email: string) {
    return this.state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  }

  createUser(payload: { email: string; name: string; username: string; passwordHash: string }) {
    const newUser = {
      id: `user-${crypto.randomUUID()}`,
      email: payload.email,
      name: payload.name,
      username: payload.username.startsWith('@') ? payload.username : `@${payload.username}`,
      avatarUrl: '/assets/images/emerald-ape.webp',
      passwordHash: payload.passwordHash,
      createdAt: new Date().toISOString(),
    }
    this.state.users.push(newUser)
    this.state.favoritesByUser[newUser.id] = []
    this.state.cartByUser[newUser.id] = []
    this.persist()
    return newUser
  }

  updateUserProfile(userId: string, data: Partial<Pick<User, 'name' | 'username' | 'bio' | 'avatarUrl' | 'ensName' | 'walletNickname'>>) {
    const user = this.getUserById(userId)
    if (!user) return null
    if (data.name) user.name = data.name
    if (data.username !== undefined) user.username = data.username
    if (data.ensName !== undefined) user.ensName = data.ensName
    if (data.walletNickname !== undefined) user.walletNickname = data.walletNickname
    if (data.bio !== undefined) user.bio = data.bio
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl
    this.persist()
    return user
  }

  changeUserPassword(userId: string, newHash: string) {
    const user = this.getUserById(userId)
    if (!user) return false
    user.passwordHash = newHash
    this.persist()
    return true
  }

  // Wallets
  getWalletsByUser(userId: string): Wallet[] {
    return this.state.wallets.filter((w) => w.userId === userId)
  }

  createWallet(userId: string, address: string, network: NetworkType, label: string) {
    const existing = this.getWalletsByUser(userId)
    const isPrimary = existing.length === 0
    const newWallet: Wallet = {
      id: `wallet-${crypto.randomUUID()}`,
      userId,
      address,
      network,
      label,
      isPrimary,
      balanceEth: '5.00',
    }
    this.state.wallets.push(newWallet)
    this.persist()
    return newWallet
  }

  updateWallet(walletId: string, userId: string, data: Partial<Pick<Wallet, 'label' | 'address' | 'network' | 'isPrimary' | 'metadata'>>) {
    const wallet = this.state.wallets.find((w) => w.id === walletId && w.userId === userId)
    if (!wallet) return null
    if (data.label) wallet.label = data.label
    if (data.address) wallet.address = data.address
    if (data.network) wallet.network = data.network
    if (data.metadata) wallet.metadata = data.metadata
    if (data.isPrimary) {
      this.state.wallets.filter((w) => w.userId === userId).forEach((w) => (w.isPrimary = false))
      wallet.isPrimary = true
    }
    this.persist()
    return wallet
  }

  deleteWallet(walletId: string, userId: string): boolean {
    const idx = this.state.wallets.findIndex((w) => w.id === walletId && w.userId === userId)
    if (idx === -1) return false
    const wasPrimary = this.state.wallets[idx].isPrimary
    this.state.wallets.splice(idx, 1)
    if (wasPrimary && this.state.wallets.filter((w) => w.userId === userId).length > 0) {
      const remaining = this.state.wallets.find((w) => w.userId === userId)
      if (remaining) remaining.isPrimary = true
    }
    this.persist()
    return true
  }

  // Favorites
  getFavorites(userId: string): string[] {
    return this.state.favoritesByUser[userId] || []
  }

  toggleFavorite(userId: string, nftId: string): { isFavorite: boolean; favorites: string[] } {
    if (!this.state.favoritesByUser[userId]) {
      this.state.favoritesByUser[userId] = []
    }
    const list = this.state.favoritesByUser[userId]
    const idx = list.indexOf(nftId)
    let isFavorite: boolean
    if (idx >= 0) {
      list.splice(idx, 1)
      isFavorite = false
    } else {
      list.push(nftId)
      isFavorite = true
    }
    this.persist()
    return { isFavorite, favorites: list }
  }

  // Cart
  getCart(userId: string): CartItem[] {
    const items = this.state.cartByUser[userId] || []
    return items.map(item => {
      const nft = this.getNFTById(item.nftId) || item.nft
      return { ...item, nft, priceEth: nft.priceEth, subtotalEth: multiplyEth(nft.priceEth, item.quantity) }
    })
  }

  addToCart(userId: string, nftId: string, edition: EditionType, quantity: number): CartItem[] {
    const nft = this.getNFTById(nftId)
    if (!nft) throw new Error('NFT não encontrado')

    if (!this.state.cartByUser[userId]) {
      this.state.cartByUser[userId] = []
    }

    const cart = this.state.cartByUser[userId]
    const existing = cart.find((item) => item.nftId === nftId && item.edition === edition)

    if (existing) {
      existing.quantity += quantity
      existing.subtotalEth = multiplyEth(existing.priceEth, existing.quantity)
    } else {
      cart.push({
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nftId,
        nft,
        edition,
        quantity,
        priceEth: nft.priceEth,
        subtotalEth: multiplyEth(nft.priceEth, quantity),
      })
    }

    this.persist()
    return cart
  }

  updateCartItemQuantity(userId: string, cartItemId: string, quantity: number): CartItem[] {
    const cart = this.state.cartByUser[userId] || []
    const item = cart.find((i) => i.id === cartItemId)
    if (item) {
      if (quantity <= 0) {
        return this.removeFromCart(userId, cartItemId)
      }
      item.quantity = quantity
      item.subtotalEth = multiplyEth(item.priceEth, quantity)
      this.persist()
    }
    return cart
  }

  removeFromCart(userId: string, cartItemId: string): CartItem[] {
    const cart = this.state.cartByUser[userId] || []
    this.state.cartByUser[userId] = cart.filter((i) => i.id !== cartItemId)
    this.persist()
    return this.state.cartByUser[userId]
  }

  clearPurchasedItemsFromCart(userId: string, purchasedItems: { nftId: string; edition: EditionType; quantity: number }[]) {
    const cart = this.state.cartByUser[userId] || []
    this.state.cartByUser[userId] = cart.filter((cartItem) => {
      const match = purchasedItems.find(
        (p) => p.nftId === cartItem.nftId && p.edition === cartItem.edition
      )
      if (!match) return true
      if (cartItem.quantity > match.quantity) {
        cartItem.quantity -= match.quantity
        cartItem.subtotalEth = multiplyEth(cartItem.priceEth, cartItem.quantity)
        return true
      }
      return false
    })
    this.persist()
  }

  mergeGuestCartIntoUser(userId: string) {
    const guestCoupon = this.getCartCoupon('guest')
    if (guestCoupon) {
      this.setCartCoupon(userId, guestCoupon)
      this.setCartCoupon('guest', undefined)
    }
    const guestCart = this.state.cartByUser['guest'] || []
    if (guestCart.length === 0) return

    guestCart.forEach((item) => {
      const existing = this.getCart(userId).find(entry => entry.id === item.id && entry.nftId === item.nftId && entry.edition === item.edition)
      // Seed carts share line IDs: these represent the same demo selection, not two purchases.
      // Independently added guest lines have unique IDs and must still be summed.
      if (existing) this.updateCartItemQuantity(userId, existing.id, Math.max(existing.quantity, item.quantity))
      else this.addToCart(userId, item.nftId, item.edition, item.quantity)
    })
    this.state.cartByUser['guest'] = []
    this.persist()
  }

  // Coupons are part of the persisted, account-scoped cart.
  getCartCoupon(userId: string) { return this.state.couponByUser?.[userId] }

  setCartCoupon(userId: string, code: string | undefined) {
    this.state.couponByUser ??= {}
    if (code) this.state.couponByUser[userId] = code
    else delete this.state.couponByUser[userId]
    this.persist()
  }

  // Coupons
  getCoupon(code: string): Coupon | undefined {
    return this.state.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase())
  }

  // Orders & Idempotency
  findOrderByKey(idempotencyKey: string): StoredOrderRecord | undefined {
    return this.state.orders.find((o) => o.idempotencyKey === idempotencyKey)
  }

  saveOrder(idempotencyKey: string, payloadString: string, order: Order) {
    this.state.orders.push({
      idempotencyKey,
      payloadString,
      order,
    })
    this.persist()
  }

  getOrderById(orderId: string): Order | undefined {
    const rec = this.state.orders.find((o) => o.order.id === orderId)
    return rec?.order
  }

  getOrdersByUser(userId: string): Order[] {
    return this.state.orders
      .filter((o) => o.order.userId === userId)
      .map((o) => o.order)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  updateOrderStatus(orderId: string, status: Order['status'], receipt?: Order['receipt']) {
    const rec = this.state.orders.find((o) => o.order.id === orderId)
    if (rec && rec.order.status === 'PENDING') {
      rec.order.status = status
      rec.order.version += 1
      rec.order.updatedAt = new Date().toISOString()
      if (receipt) {
        rec.order.receipt = receipt
      }
      this.persist()
      return rec.order
    }
    return null
  }
}

export const db = new MockDatabase()
