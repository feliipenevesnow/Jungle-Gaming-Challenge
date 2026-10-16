import React from 'react'
import { Heart, ShoppingBag, Search } from 'lucide-react'
import type { NFT } from '@/types/api'

interface NFTCardProps {
  nft: NFT
  isFavorite?: boolean
  isFavoritePending?: boolean
  onToggleFavorite?: (id: string) => void
  onAddToCart?: (nft: NFT) => void
  onSelect?: (id: string) => void
  eager?: boolean
}

export const NFTCard: React.FC<NFTCardProps> = ({
  nft,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
  onAddToCart,
  onSelect,
  eager = false,
}) => {
  return (
    <article
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onSelect?.(nft.id)
      }}
      className="nft-card group relative flex w-full max-w-[260px] flex-col rounded-xl border border-[#3F2319] bg-[#241612] p-2.5 transition-all duration-300 hover:border-[#D28A4C] hover:shadow-2xl focus-within:border-[#D28A4C] focus:outline-none"
    >
      {/* Square Artwork Container */}
      <div
        onClick={() => onSelect?.(nft.id)}
        className="nft-art relative aspect-square w-full cursor-pointer overflow-hidden rounded-2xl bg-[#140D0A]"
      >
        <img
          src={nft.imageUrl}
          alt={nft.name}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          width={520}
          height={520}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <button type="button" className="nft-mobile-favorite" disabled={isFavoritePending} aria-pressed={isFavorite} aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`} onClick={e => { e.stopPropagation(); onToggleFavorite?.(nft.id) }}><Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} /></button>
        {/* Top-Left Rectangular Badge (e.g., RARO on Neon Vessel #552) */}
        {nft.badge && (
          <span className="absolute left-0 top-3 rounded-r-sm bg-[#D28A4C] px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-[#140D0A] shadow-md z-10">
            {nft.badge}
          </span>
        )}

        {/* Hover / Focus Floating Action Bar (3 Square Buttons Centered at Bottom of Artwork) */}
        <div className="nft-actions absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-[#3F2319] bg-[#140D0A]/90 p-1.5 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100 z-20 shadow-xl">
          {/* 1. Add to Cart */}
          {onAddToCart && <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAddToCart?.(nft)
            }}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#241612] text-[#F5F1EB] transition-colors hover:bg-[#D28A4C] hover:text-[#140D0A] cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>}

          {/* 2. Toggle Favorite */}
          <button
            type="button"
            disabled={isFavoritePending}
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite?.(nft.id)
            }}
            aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            className={`flex h-8 w-8 items-center justify-center rounded-md bg-[#241612] transition-colors cursor-pointer ${
              isFavorite
                ? 'text-[#F0805F] hover:bg-[#F0805F] hover:text-white'
                : 'text-[#F5F1EB] hover:bg-[#D28A4C] hover:text-[#140D0A]'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>

          {/* 3. View Details */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelect?.(nft.id)
            }}
            aria-label={`Ver detalhes de ${nft.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#241612] text-[#F5F1EB] transition-colors hover:bg-[#D28A4C] hover:text-[#140D0A] cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Details (Name + Price Row Only, matching Figma 2:2) */}
      <div className="nft-caption flex flex-col gap-1 px-1 pt-3 pb-1">
        <h3
          onClick={() => onSelect?.(nft.id)}
          className="cursor-pointer truncate font-mono text-base font-medium text-[#F5F1EB] transition-colors group-hover:text-[#E89B55]"
          title={nft.name}
        >
          {nft.name}
        </h3>

        {/* Price in Highlight + Strikethrough Price when discounted */}
        <div className="flex items-baseline gap-2.5 pt-0.5">
          <span className="font-mono text-lg font-bold text-[#E89B55]">
            {nft.priceEth} ETH
          </span>
          {nft.originalPriceEth && (
            <span className="font-mono text-sm text-[#B39463] line-through">
              {nft.originalPriceEth} ETH
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
