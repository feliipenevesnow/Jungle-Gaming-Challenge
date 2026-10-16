import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Heart } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'
import { api } from '@/lib/axios'
import { NFTCard } from '@/components/NFTCard'
import { NFTSkeleton } from '@/components/NFTSkeleton'
import { Button } from '@/components/ui/button'
import { useActionNotice } from '@/components/ActionNotice'
import { AccountNav } from '@/components/AccountNav'
import type { NFT } from '@/types/api'

export const Route = createFileRoute('/favorites')({ component: FavoritesPage })

function FavoritesPage() {
  const { isAuthenticated, isLoading: restoringSession, openAuthModal } = useAuth()
  const { items, isLoading, isError, refetch, toggleFavorite, isUpdating } = useFavorites()
  const client = useQueryClient()
  const navigate = useNavigate()
  const showNotice = useActionNotice()
  const addToCart = useMutation({
    mutationFn: (nft: NFT) => api.post('/cart/items', { nftId: nft.id, edition: nft.edition, quantity: 1 }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['cart'] }); navigate({ to: '/cart' }) },
    onError: () => showNotice({ title: 'Não foi possível adicionar ao carrinho', description: 'Confira a disponibilidade do NFT e tente novamente.' }),
  })

  return (
    <div className="favorites-page account-page min-h-screen bg-[#140D0A] text-[#F5F1EB] font-mono py-6 md:py-10 pb-[120px] md:pb-16" aria-busy={isUpdating || addToCart.isPending ? 'true' : 'false'}>
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Account Navigation (Desktop sidebar, mobile pills) */}
          <AccountNav activeTab="favorites" />

          {/* Right Main Content */}
          <main className="flex-1" aria-busy={isUpdating || addToCart.isPending}>
            <Link to="/" className="favorites-back inline-flex items-center gap-2 text-xs text-[#CFB28C] hover:text-[#E89B55] mb-4">
              <ChevronLeft size={18} />
              Voltar ao catálogo
            </Link>

            <h1 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Heart size={24} className="text-[#D28A4C]" />
              Meus favoritos
            </h1>

            {restoringSession || (isAuthenticated && isLoading) ? (
              <div className="nft-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((id) => (
                  <NFTSkeleton key={id} />
                ))}
              </div>
            ) : !isAuthenticated ? (
              <div className="favorites-state rounded-xl border border-[#3F2319] bg-[#241612] p-8 text-center flex flex-col items-center gap-4">
                <p className="text-xs text-[#CFB28C]">
                  Entre na sua conta para consultar sua lista de interesse.
                </p>
                <Button onClick={() => openAuthModal('login')} className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-xs">
                  Entrar
                </Button>
              </div>
            ) : isError ? (
              <div className="favorites-state rounded-xl border border-[#3F2319] bg-[#241612] p-8 text-center flex flex-col items-center gap-4" role="alert">
                <p className="text-xs text-[#E89B55]">
                  Não foi possível carregar seus favoritos.
                </p>
                <Button onClick={() => refetch()} className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-xs">
                  Tentar novamente
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className="favorites-state rounded-xl border border-[#3F2319] bg-[#241612] p-8 text-center flex flex-col items-center gap-4">
                <p className="text-xs text-[#CFB28C]">
                  Você ainda não tem NFTs favoritos.
                </p>
                <Link to="/" className="text-xs text-[#D28A4C] underline hover:text-[#E89B55]">
                  Explorar o catálogo
                </Link>
              </div>
            ) : (
              <div className="nft-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((nft) => (
                  <NFTCard
                    key={nft.id}
                    nft={nft}
                    isFavorite
                    isFavoritePending={isUpdating}
                    onToggleFavorite={() => toggleFavorite(nft)}
                    onSelect={(id) => navigate({ to: '/nfts/$id', params: { id } })}
                    onAddToCart={(nft) => {
                      if (!addToCart.isPending) addToCart.mutate(nft)
                    }}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
