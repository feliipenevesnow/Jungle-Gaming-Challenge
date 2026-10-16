import React from 'react'

export const NFTSkeleton: React.FC = () => {
  return (
    <div className="nft-skeleton flex w-full flex-col" aria-hidden="true">
      <div className="nft-art relative w-full"><div className="nft-skeleton-art skeleton-shimmer" /></div>
      <div className="nft-caption">
        <div className="nft-skeleton-name skeleton-shimmer" />
        <div className="nft-skeleton-price skeleton-shimmer" />
      </div>
    </div>
  )
}
