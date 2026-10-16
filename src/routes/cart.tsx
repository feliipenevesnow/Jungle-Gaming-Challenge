import { keys } from '@/lib/query-keys'
import { useState, useEffect, useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Plus, Minus, ShoppingBag, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/axios'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/lib/auth'
import { subscribeToNftUpdates } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { CouponForm } from '@/components/CouponForm'
import { SummarySkeleton } from '@/components/SummarySkeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CartState, CartItem, QuoteResponse, NFTListResponse, NFTUpdatedEvent } from '@/types/api'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user, isAuthenticated, openAuthModal } = useAuth()

  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null)
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null)

  // Query Cart Items
  const { data: cart, isLoading, error: cartError, refetch: refetchCart } = useQuery<CartState>({
    queryKey: keys.cart(user?.id),
    queryFn: async ({ signal }) => {
      const res = await api.get('/cart', { signal })
      return res.data
    },
  })

  const cartItems = useMemo(() => cart?.items || [], [cart])
  const appliedCoupon = cart?.couponCode

  // Socket.IO live update listener
  useEffect(() => {
    if (cartItems.length === 0) return

    const unsubscribe = subscribeToNftUpdates((event: NFTUpdatedEvent) => {
      const item = cartItems.find((ci) => ci.nftId === event.resourceId)
      if (item) {
        setRealtimeAlert(
          `O item "${item.nft.name}" teve seu preço ou disponibilidade alterado em tempo real.`
        )
      }
    })

    return () => {
      unsubscribe()
    }
  }, [cartItems])

  // Quote Query
  const { data: quote, refetch: refetchQuote, error: quoteError, isPending: isQuotePending } = useQuery<QuoteResponse>({
    queryKey: keys.cartQuote(user?.id, cartItems, appliedCoupon),
    queryFn: async ({ signal }) => {
      const res = await api.post('/cart/quote', {
        items: cartItems.map((item) => ({
          nftId: item.nftId,
          quantity: item.quantity,
          edition: item.edition,
        })),
        couponCode: appliedCoupon || undefined,
        network: 'Ethereum',
      }, { signal })
      return res.data
    },
    enabled: cartItems.length > 0,
  })

  const adjustStockMutation = useMutation({
    mutationFn: () => api.post('/cart/adjust-stock'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.cart(user?.id) }),
  })

  // Mutations
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await api.patch(`/cart/items/${itemId}`, { quantity })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.cart(user?.id) })
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/cart/items/${itemId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.cart(user?.id) })
    },
  })

  // Suggested NFTs (5 items matching Figma Frame 11:1278)
  const { data: suggestedData } = useQuery<NFTListResponse>({
    queryKey: ['suggested-nfts'],
    queryFn: async ({ signal }) => {
      const res = await api.get('/nfts', { signal, params: { limit: 10 } })
      return res.data
    },
  })

  const suggestedCards = suggestedData?.items?.filter(
    (n) => ['nft-4', 'nft-5', 'nft-6', 'nft-7', 'nft-8'].includes(n.id)
  ) || suggestedData?.items?.slice(0, 5) || []

  const handleProceedToCheckout = () => {
    navigate({ to: '/checkout' })
    if (!isAuthenticated) openAuthModal('login')
  }

  if (cartError) return <div className="page-width py-16" role="alert"><p>{apiErrorMessage(cartError, 'Não foi possível carregar o carrinho.')}</p><Button onClick={() => refetchCart()}>Tentar novamente</Button></div>

  return (
    <div className="cart-page page-width font-mono pb-[380px] md:pb-12">
      {/* Breadcrumb matching Figma Frame 11:1278 */}
      <h1 className="mobile-page-heading"><Link to="/" aria-label="Voltar"><ChevronLeft /></Link>Carrinho de NFTs</h1>
      <nav className="mb-6 flex items-center gap-2 text-xs text-[#CFB28C]">
        <Link to="/" className="hover:text-[#E89B55]">
          Início
        </Link>
        <span>/</span>
        <a href="/#catalogo" className="hover:text-[#E89B55]">
          Mercado
        </a>
        <span>/</span>
        <span className="text-[#F5F1EB] font-bold">Carrinho</span>
      </nav>

      {[updateQuantityMutation.error, removeItemMutation.error, adjustStockMutation.error, quoteError].filter(Boolean).map((error, index) => <p key={index} role="alert" className="mb-4 text-sm text-[#F0805F]">{apiErrorMessage(error, 'Não foi possível atualizar o carrinho.')} <button className="underline" onClick={() => { void refetchCart(); void refetchQuote() }}>Tentar novamente</button></p>)}
      {/* Realtime Alert Banner */}
      {realtimeAlert && (
        <div role="status" aria-live="polite" className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-[#D28A4C] bg-[#D28A4C]/15 p-4 text-xs text-[#E89B55]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#E89B55]" />
            <span>{realtimeAlert}</span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              refetchQuote()
              setRealtimeAlert(null)
            }}
            className="h-8 bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-xs"
          >
            Atualizar cotação
          </Button>
        </div>
      )}

      {quote?.warnings && <div role="alert" className="mb-6 rounded border border-[#D28A4C] p-4 text-sm text-[#CFB28C]">
        {quote.warnings.map(warning => <p key={warning}>{warning}</p>)}
        <Button disabled={adjustStockMutation.isPending} onClick={() => adjustStockMutation.mutate()} className="mt-3 bg-[#D28A4C] text-[#140D0A]">Ajustar quantidades ao estoque</Button>
      </div>}
      {cartItems.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-[#3F2319] bg-[#241612] p-16 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-[#3F2319] mb-4" />
          <h2 className="text-xl font-bold text-[#F5F1EB]">Seu carrinho está vazio</h2>
          <p className="mt-2 text-xs text-[#CFB28C] max-w-md mx-auto leading-relaxed">
            Nenhum NFT foi adicionado ainda. Explore nossa coleção de arte digital e encontre sua
            próxima obra rara.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded bg-[#D28A4C] px-6 py-2.5 text-xs font-bold uppercase text-[#140D0A] hover:bg-[#E89B55]"
          >
            Explorar catálogo &rarr;
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Cart Table (8 cols) matching Figma Frame 11:1278 */}
          <div className="flex flex-col">
            <div className="cart-table overflow-x-auto rounded-xl border border-[#3F2319] bg-[#241612]">
              {/* Table Header */}
              <div className="cart-table-head grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#3F2319] text-xs font-bold text-[#F5F1EB]">
                <span className="col-span-5">NFTs</span>
                <span className="cart-unit col-span-2 text-center">Preço</span>
                <span className="col-span-3 text-center">Edições</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              {/* Items */}
              <div className="cart-rows">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="cart-row grid grid-cols-12 gap-4 items-center px-6 py-4 text-xs transition-colors hover:bg-[#140D0A]/30"
                  >
                    {/* Artwork + Title */}
                    <div className="cart-identity col-span-5 flex items-center gap-3">
                      <div className="cart-art h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#3F2319] bg-[#140D0A]">
                        <img
                          src={item.nft.imageUrl}
                          alt={item.nft.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <Link
                          to="/nfts/$id"
                          params={{ id: item.nftId }}
                          className="font-bold text-[#F5F1EB] truncate hover:text-[#E89B55]"
                        >
                          {item.nft.name}
                        </Link>
                        <span className="text-[11px] text-[#CFB28C]">
                          <span className="cart-token">ID do token: {item.nft.tokenId}</span><span className="cart-mobile-edition">Edição: {item.edition}</span>
                        </span>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="cart-unit col-span-2 text-center text-[#F5F1EB] font-medium">
                      {item.priceEth} ETH
                    </div>

                    {/* Quantity Stepper: circular orange buttons matching Figma 11:1278 */}
                    <div className="cart-stepper col-span-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantityMutation.mutate({
                              itemId: item.id,
                              quantity: item.quantity - 1,
                            })
                          } else {
                            setItemToRemove(item)
                          }
                        }}
                        aria-label="Diminuir quantidade"
                        className="h-6 w-6 rounded-full bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] flex items-center justify-center font-bold transition-transform active:scale-90 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-[#F5F1EB]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantityMutation.mutate({
                            itemId: item.id,
                            quantity: item.quantity + 1,
                          })
                        }
                        disabled={updateQuantityMutation.isPending || item.quantity >= Math.min(item.nft.availableQuantity, item.nft.editionStock?.[item.edition] ?? 0)}
                        aria-label="Aumentar quantidade"
                        className="h-6 w-6 rounded-full bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] flex items-center justify-center font-bold transition-transform active:scale-90 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="cart-line-total col-span-2 flex items-center justify-end">
                      <span className="font-bold text-[#E89B55]">{item.subtotalEth} ETH</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wallet Summary (4 cols in desktop, fixed bottom drawer on mobile) */}
          <div className="cart-summary flex flex-col gap-6 rounded-xl border border-[#3F2319] bg-[#241612] p-6 shadow-xl h-fit">
            <h2 className="hidden md:block text-base font-bold text-[#F5F1EB] pb-3 border-b border-[#3F2319]">
              Resumo da carteira
            </h2>

            {/* Promo Code Input */}
            <div className="space-y-2">
              <span className="hidden md:block text-xs font-bold text-[#F5F1EB]">Código promocional</span>
              <CouponForm code={appliedCoupon} invalidReason={cart?.couponError} />
            </div>

            {/* Financial Totals */}
            <div aria-busy={isLoading || isQuotePending} className="cart-totals financial-summary space-y-3 pt-3 border-t border-[#3F2319] text-xs text-[#CFB28C]">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="text-[#F5F1EB] font-medium text-sm">
                  {quote?.subtotalEth || '0.00'} ETH
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>Desconto do lançamento</span>
                <span className="text-[#CFB28C] font-medium text-sm">
                  (-) {quote?.discountEth && quote.discountEth !== '0.00' ? quote.discountEth : '00.00'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[#F5F1EB]">Taxa de rede</p>
                  <p className="text-[10px] text-[#CFB28C]">Taxa estimada</p>
                </div>
                <span className="text-[#F5F1EB] font-medium text-sm">
                  {quote?.networkFeeEth || '0.016'} ETH
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-[#3F2319] text-base font-bold text-[#F5F1EB]">
                <span>Total</span>
                <span className="text-xl text-[#E89B55]">{quote?.totalEth || '0.00'} ETH</span>
              </div>
              {(isLoading || isQuotePending) && <SummarySkeleton />}
            </div>

            {/* Checkout Action CTA */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={!quote?.valid || !!quoteError || isLoading || isQuotePending}
                className="w-full h-12 md:h-11 bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-xs uppercase tracking-wider rounded-full md:rounded-[4px] shadow-lg cursor-pointer"
              >
                Conectar e finalizar
              </Button>
              <Link
                to="/"
                className="hidden md:block text-center text-xs text-[#E89B55] hover:underline transition-colors"
              >
                Continuar explorando
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Colecionadores também viram (5 cards + 3 dots pagination per Figma 11:1278) */}
      {suggestedCards.length > 0 && (
        <section className="cart-related mt-20 border-t border-[#3F2319] pt-12">
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#E89B55]">Colecionadores também viram</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {suggestedCards.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate({ to: '/nfts/$id', params: { id: item.id } })}
                className="group flex flex-col cursor-pointer transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl border border-[#3F2319] bg-[#241612]">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="mt-2 flex flex-col gap-0.5">
                  <p className="font-bold text-xs text-[#F5F1EB] truncate group-hover:text-[#E89B55]">
                    {item.name}
                  </p>
                  <p className="text-xs font-bold text-[#E89B55]">
                    {item.priceEth} ETH
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 3 Pagination dots matching Figma Frame 11:1278 */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full border border-[#D28A4C]" />
            <span className="h-2 w-2 rounded-full bg-[#D28A4C]" />
            <span className="h-2 w-2 rounded-full border border-[#D28A4C]" />
          </div>
        </section>
      )}

      {/* Confirmation Modal for Removing Item */}
      <Dialog open={!!itemToRemove} onOpenChange={(open) => { if (!open) setItemToRemove(null) }}>
        <DialogContent className="max-w-md border border-[#3F2319] bg-[#241612] text-[#F5F1EB] font-mono">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#F5F1EB]">
              Remover item do carrinho?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#CFB28C] leading-relaxed pt-1">
              Deseja realmente remover este NFT do seu carrinho de compras?
            </DialogDescription>
          </DialogHeader>

          {itemToRemove && (
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[#3F2319] bg-[#140D0A]/70 my-2">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#3F2319]">
                <img
                  src={itemToRemove.nft.imageUrl}
                  alt={itemToRemove.nft.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-[#F5F1EB] truncate">
                  {itemToRemove.nft.name}
                </span>
                <span className="text-xs text-[#CFB28C]">
                  Edição: {itemToRemove.edition}
                </span>
                <span className="text-xs font-bold text-[#D28A4C] mt-0.5">
                  {itemToRemove.priceEth} ETH
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemToRemove(null)}
              className="border-[#3F2319] bg-[#140D0A] text-[#CFB28C] hover:bg-[#241612] hover:text-[#F5F1EB] text-xs h-9 px-4 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (itemToRemove) {
                  removeItemMutation.mutate(itemToRemove.id)
                  setItemToRemove(null)
                }
              }}
              className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-xs h-9 px-4 cursor-pointer"
            >
              Remover item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
