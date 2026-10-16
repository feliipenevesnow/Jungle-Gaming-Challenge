import { catalogQuery } from '@/lib/catalog-query'
import { lazy, Suspense, useState, useEffect, useCallback } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFavorites } from '@/lib/favorites'
import { UnavailableAction } from '@/components/ActionNotice'
import { Hero } from '@/components/Hero'
import { NFTCard } from '@/components/NFTCard'
import { NFTSkeleton } from '@/components/NFTSkeleton'
import { useMediaQuery } from '@/lib/use-media-query'
import { api } from '@/lib/axios'
import { subscribeToNftUpdates } from '@/lib/socket'
import type { NFT, NFTListResponse, NFTUpdatedEvent } from '@/types/api'
import { ArrowRight, Search, SlidersHorizontal, RefreshCw } from 'lucide-react'

import type { HomeSearchParams } from '@/routes/index'

const SidebarFilters = lazy(() => import('@/components/SidebarFilters').then(module => ({ default: module.SidebarFilters })))
const FormSelect = lazy(() => import('@/components/FormSelect').then(module => ({ default: module.FormSelect })))

export function HomePage() {
  const mobile = useMediaQuery('(max-width: 767px)')
  const queryClient = useQueryClient()
  const searchParams = useSearch({ strict: false }) as HomeSearchParams
  const navigate = useNavigate({ from: '/' })

  const {
    search = '',
    collection = '',
    network = '',
    minPrice = '',
    maxPrice = '',
    tab = 'all',
    sort = 'recent',
    page = 1,
  } = searchParams

  // Local state for instant input responsiveness before committing to URL
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState({ source: search, value: search })
  const searchInput = searchDraft.source === search ? searchDraft.value : search
  const setSearchInput = (value: string) => setSearchDraft({ source: search, value })

  // Helper to update URL search params with page reset
  const updateFilters = useCallback(
    (newParams: Partial<HomeSearchParams>, resetPage = true) => {
      navigate({
        search: (prev) => {
          const next = {
            ...prev,
            ...newParams,
            page: resetPage ? 1 : newParams.page ?? prev.page ?? 1,
          }
          // Clean empty or undefined values from query string
          const cleaned: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(next)) {
            if (v !== undefined && v !== '' && v !== null) {
              cleaned[k] = v
            }
          }
          return cleaned as HomeSearchParams
        },
      })
    },
    [navigate]
  )

  // Query NFTs from API based on URL search params
  const { data, isLoading, isFetching, isError, refetch } = useQuery(catalogQuery(searchParams))

  // Real-time Socket.IO subscription
  useEffect(() => {
    const unsubscribe = subscribeToNftUpdates((event: NFTUpdatedEvent) => {
      console.log('[Home Realtime] NFT updated via socket:', event)
      queryClient.setQueriesData<NFTListResponse>({ queryKey: ['nfts'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === event.resourceId
              ? {
                  ...item,
                  priceEth: event.priceEth,
                  availableQuantity: event.availableQuantity,
                  version: event.version,

                }
              : item
          ),
        }
      })
    })

    return () => {
      unsubscribe()
    }
  }, [queryClient])

  const { favoriteIds, toggleFavorite, isUpdating } = useFavorites()
  const handleToggleFavorite = (id: string) => {
    const nft = data?.items.find(item => item.id === id)
    if (nft) toggleFavorite(nft)
  }

  // Real Add to Cart Mutation
  const addToCartMutation = useMutation({
    mutationFn: async (nft: NFT) => {
      await api.post('/cart/items', {
        nftId: nft.id,
        quantity: 1,
        edition: nft.edition || '1/50',
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['cart-quote'] }),
        queryClient.invalidateQueries({ queryKey: ['checkout-quote'] }),
      ])
    },
  })

  const handleAddToCart = (nft: NFT) => {
    addToCartMutation.mutate(nft)
  }

  const handleClearFilters = () => {
    updateFilters({
      collection: undefined,
      network: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      search: undefined,
    })
    setSearchInput('')
  }

  return (
    <div className="home-page bg-[#140D0A] text-[#F5F1EB]">
      <div className="mobile-search"><form onSubmit={e => { e.preventDefault(); updateFilters({ search: searchInput }) }}><Search size={21} /><input aria-label="Buscar coleções" placeholder="Explorar coleções" value={searchInput} onChange={e => setSearchInput(e.target.value)} /></form><button disabled={isLoading} aria-label="Filtros do catálogo" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={22} /></button></div>
      {/* Hero Section */}
      <Hero />

      {addToCartMutation.isError && <p className="page-width text-[#F0805F]" role="alert">Não foi possível adicionar o NFT. Confira o estoque e tente novamente.</p>}
      {/* Catalog & Filter Section */}
      <section id="catalogo" aria-busy={isFetching} className="catalog-section mx-auto max-w-[1240px] px-4 py-16 md:px-8">
        <div className="flex flex-col gap-10 md:flex-row">
          {/* Left Column: Filters */}
          {(!mobile || filtersOpen) && <Suspense fallback={<aside className="catalog-filters" aria-label="Carregando filtros" aria-busy="true"><div className="filter-panel skeleton-shimmer h-[720px]" /></aside>}><SidebarFilters
            mobileOpen={filtersOpen}
            onMobileOpenChange={setFiltersOpen}
            collections={data?.collections || []}
            networks={data?.networks || []}
            selectedCollection={collection}
            selectedNetwork={network}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onSelectCollection={(col) => updateFilters({ collection: col })}
            onSelectNetwork={(net) => updateFilters({ network: net })}
            onPriceChange={(min, max) => updateFilters({ minPrice: min, maxPrice: max })}
            onClearFilters={handleClearFilters}
            selectedSort={sort}
            onSortChange={value => updateFilters({ sort: value })}
          /></Suspense>}

          {/* Right Column: Catalog */}
          <div className="catalog-content flex flex-1 flex-col gap-8">
            {/* Toolbar: Search, Tabs & Sort */}
            <div className="catalog-toolbar flex flex-col gap-4 border-b border-[#3F2319] pb-4">
              <div className="catalog-search relative w-full sm:max-w-md">
                <input
                  type="text"
                  aria-label="Buscar NFTs"
                  placeholder="Buscar por nome, edição, coleção..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateFilters({ search: searchInput })
                    }
                  }}
                  onBlur={() => {
                    if (searchInput !== search) {
                      updateFilters({ search: searchInput })
                    }
                  }}
                  className="w-full rounded-md border border-[#3F2319] bg-[#241612] py-2 pl-9 pr-3 font-mono text-xs text-[#F5F1EB] placeholder:text-[#CFB28C]/60 focus:border-[#D28A4C] focus:outline-none"
                />
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#CFB28C]" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Category Tabs */}
                <div className="catalog-tabs flex items-center gap-6 font-mono text-sm">
                  <button
                    type="button"
                    onClick={() => updateFilters({ tab: 'all' })}
                    className={`pb-2 transition-colors cursor-pointer ${
                      tab === 'all'
                        ? 'border-b-2 border-[#D28A4C] font-bold text-[#E89B55]'
                        : 'text-[#F5F1EB] hover:text-[#E89B55]'
                    }`}
                  >
                    Todos os NFTs
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFilters({ tab: 'new' })}
                    className={`pb-2 transition-colors cursor-pointer ${
                      tab === 'new'
                        ? 'border-b-2 border-[#D28A4C] font-bold text-[#E89B55]'
                        : 'text-[#F5F1EB] hover:text-[#E89B55]'
                    }`}
                  >
                    Novos lançamentos
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFilters({ tab: 'trending' })}
                    className={`pb-2 transition-colors cursor-pointer ${
                      tab === 'trending'
                        ? 'border-b-2 border-[#D28A4C] font-bold text-[#E89B55]'
                        : 'text-[#F5F1EB] hover:text-[#E89B55]'
                    }`}
                  >
                    Em alta
                  </button>
                </div>

                {/* Sort Selector */}
                {!mobile && <div className="catalog-sort flex items-center gap-2 font-mono text-xs text-[#CFB28C]">
                  <span>Ordenar por:</span>
                  <div className="relative">
                    <Suspense fallback={<span className="catalog-sort-trigger">Listados recentemente</span>}><FormSelect aria-label="Ordenar NFTs"
                      value={sort}
                      onValueChange={value => updateFilters({ sort: value as HomeSearchParams['sort'] })}
                      className="catalog-sort-trigger"
                      options={[{ value: 'recent', label: 'Listados recentemente' }, { value: 'price_asc', label: 'Menor preço' }, { value: 'price_desc', label: 'Maior preço' }]}
                    /></Suspense>
                  </div>
                </div>}
              </div>
            </div>

            {/* Background Update Indicator */}
            {isFetching && !isLoading && (
              <div className="catalog-sync-indicator mb-4 inline-flex items-center gap-2 rounded-full border border-[#3F2319] bg-[#241612] px-3.5 py-1 text-xs text-[#D28A4C] animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin text-[#E89B55]" />
                <span>Atualizando catálogo em segundo plano...</span>
              </div>
            )}

            {/* Content Area */}
            {isLoading ? (
              <div className="nft-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Carregando catálogo">
                {Array.from({ length: 9 }).map((_, i) => (
                  <NFTSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#3F2319] bg-[#241612] p-12 text-center font-mono">
                <p className="text-base font-bold text-[#E89B55]">
                  Falha ao carregar o catálogo de NFTs.
                </p>
                <p className="mt-1 text-xs text-[#CFB28C]">
                  Ocorreu um erro na requisição com o mock da API.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-4 rounded bg-[#D28A4C] px-5 py-2 text-xs font-bold text-[#140D0A] hover:bg-[#E89B55] cursor-pointer"
                >
                  Tentar novamente
                </button>
              </div>
            ) : data?.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#3F2319] bg-[#241612] p-12 text-center font-mono">
                <p className="text-base font-bold text-[#E89B55]">
                  Nenhum NFT encontrado com os filtros selecionados.
                </p>
                <p className="mt-1 text-xs text-[#CFB28C]">
                  Tente alterar os termos da busca ou limpar os filtros.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-4 rounded bg-[#D28A4C] px-5 py-2 text-xs font-bold text-[#140D0A] hover:bg-[#E89B55] cursor-pointer"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="nft-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
                {data?.items.map((nft, index) => (
                  <NFTCard
                    key={nft.id}
                    nft={nft}
                    eager={index < 2}
                    isFavorite={favoriteIds.includes(nft.id)}
                    isFavoritePending={isUpdating}
                    onToggleFavorite={handleToggleFavorite}
                    onAddToCart={handleAddToCart}
                    onSelect={(id) => {
                      navigate({ to: '/nfts/$id', params: { id } })
                    }}

                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {data && data.totalPages > 1 && (
              <div className="catalog-pagination mt-8 flex items-center justify-center gap-2">
                {Array.from({ length: data.totalPages }).map((_, index) => {
                  const pageNum = index + 1
                  const isActive = page === pageNum
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => updateFilters({ page: pageNum }, false)}
                      className={`flex h-9 w-9 items-center justify-center rounded border font-mono text-sm font-bold transition-colors cursor-pointer ${
                        isActive
                          ? 'border-[#D28A4C] bg-[#D28A4C] text-[#140D0A]'
                          : 'border-[#3F2319] bg-[#241612] text-[#F5F1EB] hover:border-[#D28A4C]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Promos Section (Matching Figma frame 70353:241) */}
      <section id="promos" className="mx-auto max-w-[1240px] px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Promo 1 */}
          <div className="flex flex-col-reverse items-center justify-between gap-6 rounded-2xl border border-[#3F2319] bg-[#241612] p-8 sm:flex-row">
            <div className="flex flex-1 flex-col gap-3 font-mono">
              <h3 className="text-xl font-bold text-[#F5F1EB]">
                Lançamentos gênesis de edição limitada
              </h3>
              <p className="text-xs leading-relaxed text-[#CFB28C]">
                Colecione edições escassas diretamente dos criadores antes da revelação pública.
              </p>
              <a
                href="#catalogo"
                className="mt-2 inline-flex w-fit items-center gap-2 rounded bg-[#D28A4C] px-5 py-2 text-xs font-bold text-[#140D0A] transition-colors hover:bg-[#E89B55]"
              >
                Explorar <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="h-44 w-44 shrink-0 overflow-hidden rounded-xl border border-[#3F2319]">
              <img
                src="/assets/images/promo-genesis.webp"
                alt="Promo Genesis"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Promo 2 */}
          <div className="flex flex-col-reverse items-center justify-between gap-6 rounded-2xl border border-[#3F2319] bg-[#241612] p-8 sm:flex-row">
            <div className="flex flex-1 flex-col gap-3 font-mono">
              <h3 className="text-xl font-bold text-[#F5F1EB]">
                Arte digital selecionada e muito mais
              </h3>
              <p className="text-xs leading-relaxed text-[#CFB28C]">
                Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.
              </p>
              <a
                href="#catalogo"
                className="mt-2 inline-flex w-fit items-center gap-2 rounded bg-[#D28A4C] px-5 py-2 text-xs font-bold text-[#140D0A] transition-colors hover:bg-[#E89B55]"
              >
                Explorar <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="h-44 w-44 shrink-0 overflow-hidden rounded-xl border border-[#3F2319]">
              <img
                src="/assets/images/promo-curated.webp"
                alt="Promo Curated"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Educational / Blog Section (Matching Figma frame 70353:288) */}
      <section id="blog" className="mx-auto max-w-[1240px] px-4 py-16 md:px-8 font-mono">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D28A4C]">
            Diário da Cunhagem
          </span>
          <h2 className="text-2xl font-bold text-[#F5F1EB]">
            Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Como funciona a propriedade de NFTs',
              category: '12 de setembro | Leitura de 6 min',
              description: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
              image: '/assets/images/blog-1.webp',
            },
            {
              title: '10 artistas digitais para acompanhar',
              category: '13 de setembro | Leitura de 2 min',
              description: 'Conheça criadores que moldam a cultura digital.',
              image: '/assets/images/blog-2.webp',
            },
            {
              title: 'Raridade, atributos e procedência',
              category: '15 de setembro | Leitura de 3 min',
              description: 'Entenda raridade, procedência, direitos autorais e utilidade.',
              image: '/assets/images/blog-3.webp',
            },
            {
              title: 'Como proteger sua carteira',
              category: '15 de setembro | Leitura de 2 min',
              description: 'Proteja sua carteira, seus ativos e sua identidade.',
              image: '/assets/images/blog-4.webp',
            },
          ].map((post, idx) => (
            <div
              key={idx}
              className="group overflow-hidden rounded-xl border border-[#3F2319] bg-[#241612] transition-colors hover:border-[#D28A4C]"
            >
              <div className="aspect-video w-full overflow-hidden bg-[#140D0A]">
                <img
                  src={post.image}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[#D28A4C]">
                  {post.category}
                </span>
                <h3 className="text-sm font-bold text-[#F5F1EB] group-hover:text-[#E89B55] transition-colors">
                  {post.title}
                </h3>
                <p className="blog-description">{post.description}</p>
                <UnavailableAction className="blog-read" name={post.title}>Ler mais →</UnavailableAction>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
