import { keys } from '@/lib/query-keys'
import { nftQuery } from '@/lib/catalog-query'
import { useState, useEffect, useRef } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, Star, Share2, ArrowLeft, Plus, Minus, Check, ShoppingCart, ChevronLeft, Search } from 'lucide-react'
import { useFavorites } from '@/lib/favorites'
import { useActionNotice } from '@/components/ActionNotice'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { api } from '@/lib/axios'
import { isAxiosError } from 'axios'
import { subscribeToNftUpdates } from '@/lib/socket'
import { NFTCard } from '@/components/NFTCard'
import { Button } from '@/components/ui/button'
import type { NFT, EditionType, NFTListResponse, NFTUpdatedEvent } from '@/types/api'

export const Route = createFileRoute('/nfts/$id')({
  loader: ({ context, params }) => { void context.queryClient.prefetchQuery(nftQuery(params.id)) },
  component: NFTDetailRoute,
})

function NFTDetailRoute() { const { id } = Route.useParams(); return <NFTDetailPage key={id} /> }

function NFTDetailPage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Selected gallery image, edition and quantity state
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [editionChoice, setSelectedEdition] = useState<EditionType | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<'details' | 'traits'>('details')
  const [shareNotice, setShareNotice] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)
  const zoomTrigger = useRef<HTMLButtonElement>(null)
  const showNotice = useActionNotice()

  // Query NFT Detail from API
  const { data: nft, isLoading, isError, error, refetch } = useQuery(nftQuery(id))

  const selectedEdition = editionChoice || nft?.edition || '1/50'

  // Real-time updates for this NFT via Socket.IO
  useEffect(() => {
    if (!nft) return

    const unsubscribe = subscribeToNftUpdates((event: NFTUpdatedEvent) => {
      if (event.resourceId === nft.id) {
        console.log('[NFT Detail Realtime] Updating live NFT data:', event)
        queryClient.setQueryData<NFT>(keys.nft(id), (old) => {
          if (!old) return old
          return {
            ...old,
            priceEth: event.priceEth,
            availableQuantity: event.availableQuantity,
            version: event.version,
          }
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [nft, id, queryClient])

  const { favoriteIds, toggleFavorite, isUpdating } = useFavorites()
  const isFavorite = nft ? favoriteIds.includes(nft.id) : false
  const handleToggleFavorite = () => { if (nft) toggleFavorite(nft) }
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareNotice(true)
    } catch {
      setShareNotice(false)
      showNotice({ title: 'Não foi possível copiar', description: 'O navegador não permitiu copiar o link. Você pode copiá-lo pela barra de endereço.' })
    }
  }

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ shouldCheckout }: { shouldCheckout?: boolean }) => {
      if (!nft) return
      await api.post('/cart/items', {
        nftId: nft.id,
        quantity,
        edition: selectedEdition,
      })
      return shouldCheckout
    },
    onSuccess: (shouldCheckout) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      if (shouldCheckout) {
        navigate({ to: '/checkout' })
      } else {
        navigate({ to: '/cart' })
      }
    },
  })

  // Query more from this collection
  const { data: relatedData } = useQuery<NFTListResponse>({
    queryKey: ['related-nfts', nft?.collection],
    queryFn: async ({ signal }) => {
      const res = await api.get('/nfts', { signal,
        params: { limit: 12 },
      })
      return res.data
    },
    enabled: !!nft?.collection,
  })

  const relatedItems = (Array.isArray(relatedData?.items) ? relatedData.items : []).filter((item) => ['nft-4', 'nft-5', 'nft-6', 'nft-7', 'nft-8'].includes(item.id)).slice(0, 5)

  if (isLoading) {
    return (
      <div className="detail-page page-width detail-loading" role="status" aria-label="Carregando NFT">
        <div className="detail-breadcrumb"><span className="skeleton-shimmer inline-block h-5 w-36 rounded" /></div>
        <div className="detail-mobile-bar"><span className="skeleton-shimmer h-9 w-9 rounded-full" /><span className="skeleton-shimmer h-9 w-9 rounded-full" /></div>
        <div className="detail-showcase">
          <div className="detail-gallery">
            <div className="detail-thumbnails">{[0, 1, 2].map(index => <div key={index} className="skeleton-shimmer aspect-square rounded-lg" />)}</div>
            <div className="detail-art skeleton-shimmer" />
          </div>
          <div className="detail-info gap-6">
            <div className="h-10 w-3/4 skeleton-shimmer rounded-md" />
            <div className="h-6 w-1/4 skeleton-shimmer rounded-md" />
            <div className="h-24 w-full skeleton-shimmer rounded-md" />
            <div className="h-12 w-1/2 skeleton-shimmer rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  if (isError && !(isAxiosError(error) && error.response?.status === 404)) return <div className="page-width py-16" role="alert"><h1>Não foi possível carregar o NFT</h1><p>Confira sua conexão e tente novamente.</p><Button onClick={() => refetch()}>Tentar novamente</Button></div>
  if (isError || !nft) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-24 text-center font-mono">
        <h1 className="text-2xl font-bold text-[#F0805F]">NFT não encontrado</h1>
        <p className="mt-2 text-sm text-[#CFB28C]">
          O identificador &quot;{id}&quot; não corresponde a nenhuma obra em nosso catálogo.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded bg-[#D28A4C] px-6 py-2.5 text-xs font-bold uppercase text-[#140D0A] hover:bg-[#E89B55]"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
        </Link>
      </div>
    )
  }

  const galleryImages = Array.isArray(nft.thumbnails)
    ? nft.thumbnails.filter(image => typeof image === 'string' && image.length > 0)
    : []
  const thumbnails = galleryImages.length > 0 ? galleryImages : [nft.imageUrl]
  const contractAddress = typeof nft.contractAddress === 'string' ? nft.contractAddress.trim() : ''
  const contractDescription = contractAddress
    ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)} · Contrato inteligente ERC-721 verificado.`
    : 'Endereço do contrato não informado.'
  const attributes = Array.isArray(nft.attributes)
    ? nft.attributes.filter(attribute => attribute && typeof attribute.trait_type === 'string' && typeof attribute.value === 'string')
    : []
  const editionAvailable = Math.min(nft.availableQuantity, nft.editionStock?.[selectedEdition] ?? 0)
  const isSoldOut = editionAvailable <= 0

  return <div className="detail-page page-width">
    <nav className="detail-breadcrumb"><Link to="/">Início</Link> / <Link to="/" search={{}}>Mercado</Link></nav>
    {addToCartMutation.isError && <p role="alert" className="text-[#F0805F]">Não foi possível adicionar o NFT. Confira o estoque e tente novamente.</p>}
    <div className="detail-mobile-bar"><Link to="/" aria-label="Voltar ao catálogo"><ChevronLeft /></Link><button disabled={isUpdating} onClick={handleToggleFavorite} aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Heart fill={isFavorite ? 'currentColor' : 'none'} /></button></div>
    <div className="detail-showcase">
      <div className="detail-gallery">
        <div className="detail-thumbnails">{thumbnails.map((thumb,index) => <button key={thumb} onClick={() => setSelectedImage(thumb)} aria-label={`Ver imagem ${index + 1}`}><img src={thumb} alt={`Vista ${index + 1} de ${nft.name}`} /></button>)}</div>
        <div className="detail-art"><picture>{nft.detailImageUrl && (!selectedImage || selectedImage === nft.imageUrl) && <source media="(min-width: 768px)" srcSet={nft.detailImageUrl} />}<img src={selectedImage || nft.imageUrl} alt={nft.name} fetchPriority="high" /></picture><button ref={zoomTrigger} className="detail-zoom" aria-label="Ampliar imagem do NFT" onClick={() => setZoomOpen(true)}><Search size={28} aria-hidden="true" /></button></div>
      </div>
      <div className="detail-info">
        <h1>{nft.name}</h1>
        <div className="detail-price-rating"><strong>{nft.priceEth} ETH</strong><div className="detail-rating"><span className="detail-stars">★★★★★</span><span className="detail-desktop-reviews">{nft.reviewsCount || 19} avaliações de colecionadores</span><span className="detail-mobile-reviews"><Star size={14} fill="currentColor" />4.8({nft.reviewsCount || 19})</span></div></div>
        <div className="detail-description"><h2>Sobre este NFT:</h2><p className="detail-desktop-description">{nft.description}</p><p className="detail-mobile-description">Um colecionável digital {selectedEdition} finalizado à mão da coleção Kurio Editions, verificado na {nft.network}.</p></div>
        <fieldset className="detail-editions"><legend>Edição:</legend><div>{(['1/1','1/10','1/50','ABERTA'] as EditionType[]).map(ed => <button key={ed} disabled={(nft.editionStock?.[ed] ?? 0) === 0} onClick={() => { setSelectedEdition(ed); setQuantity(1) }} aria-pressed={selectedEdition === ed}>{ed}</button>)}</div></fieldset>
        {isSoldOut && <p role="status">Esgotado nesta edição</p>}
        <div className="detail-purchase">
          <div className="detail-quantity"><span className="detail-quantity-label">Qtd.</span><button aria-label="Diminuir quantidade" onClick={() => setQuantity(q => Math.max(1,q-1))} disabled={quantity <= 1 || isSoldOut}><Minus size={16} /></button><span>{quantity}</span><button aria-label="Aumentar quantidade" onClick={() => setQuantity(q => Math.min(editionAvailable,q+1))} disabled={quantity >= editionAvailable || isSoldOut}><Plus size={16} /></button></div>
          <strong className="detail-mobile-price">{nft.priceEth} ETH</strong>
          <Button className="detail-buy" disabled={isSoldOut || quantity > editionAvailable || addToCartMutation.isPending} onClick={() => addToCartMutation.mutate({ shouldCheckout: true })}>{addToCartMutation.isPending ? 'Processando...' : <><span className="detail-desktop-buy">COMPRAR</span><span className="detail-mobile-buy">Comprar NFT</span></>}</Button>
          <button className="detail-favorite" disabled={isUpdating} onClick={handleToggleFavorite}><Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />Favoritar</button>
          <button className="detail-add-cart" aria-label="Adicionar ao Carrinho" disabled={isSoldOut || quantity > editionAvailable || addToCartMutation.isPending} onClick={() => addToCartMutation.mutate({ shouldCheckout: false })}><ShoppingCart size={22} /></button>
          {addToCartMutation.isError && <p role="alert">Não foi possível adicionar este NFT. Tente novamente.</p>}
        </div>
        <div className="detail-metadata"><p>ID do token: {nft.tokenId}</p><p>Coleção: Kurio Apes</p><p>Atributos: {attributes.slice(0,2).flatMap(attr => attr.trait_type === 'Raridade' ? [attr.value] : [attr.trait_type,attr.value]).join(', ')}</p><div className="detail-share">Compartilhar este NFT: <button onClick={copyLink} aria-label="Copiar link do NFT">{shareNotice ? <Check size={16} /> : <Share2 size={16} />}</button></div></div>
      </div>
    </div>
    <Dialog open={zoomOpen} onOpenChange={setZoomOpen}><DialogContent className="nft-zoom-dialog" onCloseAutoFocus={event => { event.preventDefault(); zoomTrigger.current?.focus() }}><DialogTitle>{nft.name}</DialogTitle><DialogDescription>Imagem ampliada do NFT selecionado.</DialogDescription><img src={selectedImage || nft.imageUrl} alt={nft.name} /></DialogContent></Dialog>
    <section className="detail-tabs"><div role="tablist"><button role="tab" aria-selected={activeTab === 'details'} onClick={() => setActiveTab('details')}>Detalhes do NFT</button><button role="tab" aria-selected={activeTab === 'traits'} onClick={() => setActiveTab('traits')}>Avaliações de colecionadores ({nft.reviewsCount || 19})</button></div>{activeTab === 'details' ? <div className="detail-about"><p>{nft.about}</p><p>A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe {nft.creatorRoyaltyPercent}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.</p><p><b>Rede:</b><br />Cunhado na {nft.network} com procedência imutável e metadados armazenados no IPFS.</p><p><b>Contrato:</b><br />Direitos autorais do criador: {nft.creatorRoyaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p><p><b>Direitos autorais:</b><br />{contractDescription}</p></div> : <p className="detail-about">Avaliação média: {nft.rating}/5 · {nft.reviewsCount} avaliações de colecionadores.</p>}</section>
    {relatedItems.length > 0 && <section className="detail-related"><h2>Mais desta coleção</h2><div className="detail-related-grid">{relatedItems.map(item => <NFTCard key={item.id} nft={item} isFavoritePending={isUpdating} isFavorite={favoriteIds.includes(item.id)} onSelect={selectedId => navigate({ to: '/nfts/$id', params: { id: selectedId } })} onToggleFavorite={() => toggleFavorite(item)} />)}</div><div className="carousel-dots" aria-hidden="true">○ ● ○</div></section>}
  </div>
}
