import React, { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { FormSelect } from '@/components/FormSelect'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { parseEthToBigInt } from '@/lib/decimal'
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'
import { useMediaQuery } from '@/lib/use-media-query'

interface SidebarFiltersProps {
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  collections: { name: string; count: number }[]
  networks: { name: string; count: number }[]
  selectedCollection?: string
  selectedNetwork?: string
  minPrice?: string
  maxPrice?: string
  onSelectCollection: (col: string) => void
  onSelectNetwork: (net: string) => void
  onPriceChange: (min: string, max: string) => void
  onClearFilters: () => void
  selectedSort?: string
  onSortChange?: (value: 'recent' | 'price_asc' | 'price_desc') => void
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  mobileOpen = false,
  onMobileOpenChange,
  collections,
  networks,
  selectedCollection = '',
  selectedNetwork = '',
  minPrice = '0.02',
  maxPrice = '12.30',
  onSelectCollection,
  onSelectNetwork,
  onPriceChange,
  onClearFilters,
  selectedSort = 'recent',
  onSortChange,
}) => {
  const mobile = useMediaQuery('(max-width: 767px)')
  const exactMin = minPrice || '0.02'
  const exactMax = maxPrice || '12.30'
  const source = `${exactMin}/${exactMax}`
  const [rangeDraft, setRangeDraft] = useState({ source, value: [exactMin, exactMax] })
  const range = rangeDraft.source === source ? rangeDraft.value : [exactMin, exactMax]
  const [priceError, setPriceError] = useState('')
  const [priceEditorOpen, setPriceEditorOpen] = useState(false)
  // The slider has 0.01 ETH steps; exact strings remain intact until it is moved.
  const sliderRange = range.map(value => Math.max(0, Math.min(15, Number(value) || 0)))
  const setSliderRange = (value: number[]) => setRangeDraft({ source, value: value.map(amount => amount.toFixed(2)) })

  const hasActiveFilters = Boolean(
    selectedCollection || selectedNetwork || (minPrice && minPrice !== '0.02') || (maxPrice && maxPrice !== '12.30')
  )

  const handleApply = () => {
    try {
      if (parseEthToBigInt(range[0]) < 0n || parseEthToBigInt(range[0]) > parseEthToBigInt(range[1])) throw new Error()
      setPriceError(''); onPriceChange(range[0].trim(), range[1].trim()); return true
    } catch { setPriceError('Informe uma faixa válida, com até 18 casas decimais e mínimo menor ou igual ao máximo.'); return false }
  }

  const formatEthLabel = (value: string) => value.replace('.', ',')

  const panel = (
      <div className="filter-panel flex flex-col gap-6 rounded-xl border border-[#3F2319] bg-[#241612] p-5 shadow-lg">
        {/* Header & Reset */}
        <div className="flex items-center justify-between border-b border-[#3F2319] pb-3">
          <h2 className="font-mono text-base font-bold uppercase tracking-wider text-[#F5F1EB]">
            Filtros
          </h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="font-mono text-xs text-[#E89B55] hover:underline cursor-pointer"
            >
              Limpar todos
            </button>
          )}
        </div>

        {/* Collections */}
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-sm font-bold text-[#F5F1EB]">Coleções</h3>
          <ul className="flex flex-col gap-1.5 font-mono text-xs">
            {collections.map((col) => {
              const isSelected = selectedCollection.toLowerCase() === col.name.toLowerCase()
              return (
                <li
                  key={col.name}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectCollection(isSelected ? '' : col.name)
                    }
                  }}
                  onClick={() => onSelectCollection(isSelected ? '' : col.name)}
                  className={`flex cursor-pointer items-center justify-between py-1 transition-colors hover:text-[#E89B55] ${
                    isSelected ? 'font-bold text-[#E89B55]' : 'text-[#CFB28C]'
                  }`}
                >
                  <span className="truncate">{col.name}</span>
                  <span className="font-bold">({col.count})</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Dual-Thumb Price Range Slider matching Figma 70485:357 */}
        <div className="flex flex-col gap-3 border-t border-[#3F2319] pt-4">
          <h3 className="font-mono text-sm font-bold text-[#F5F1EB]">Faixa de preço</h3>

          <div className="flex flex-col gap-3 px-1 pt-1">
            <Slider
              min={0.0}
              max={15.0}
              step={0.01}
              value={sliderRange}
              onValueChange={(val) => setSliderRange(val)}
              className="my-1"
            />

            <div className="flex items-center justify-between pt-1">
              <Dialog open={priceEditorOpen} onOpenChange={setPriceEditorOpen}>
                <DialogTrigger className="price-range-trigger font-mono text-xs text-[#F5F1EB] text-left" title="Editar os valores exatos" aria-label="Editar faixa de preço">Preço: {formatEthLabel(range[0])} - {formatEthLabel(range[1])} ETH</DialogTrigger>
                <DialogContent className={mobile ? 'z-[170]' : undefined} overlayClassName={mobile ? 'z-[160]' : undefined}>
                  <DialogTitle>Faixa de preço em ETH</DialogTitle><DialogDescription>Informe valores exatos com até 18 casas decimais. O controle deslizante usa passos de 0,01 ETH.</DialogDescription>
                  <form onSubmit={event => { event.preventDefault(); if (handleApply()) setPriceEditorOpen(false) }} className="space-y-4">
                    <label className="block text-sm">Preço mínimo em ETH<Input value={range[0]} inputMode="decimal" aria-invalid={!!priceError} aria-describedby={priceError ? 'price-range-error' : undefined} onChange={event => setRangeDraft({ source, value: [event.target.value, range[1]] })} /></label>
                    <label className="block text-sm">Preço máximo em ETH<Input value={range[1]} inputMode="decimal" aria-invalid={!!priceError} aria-describedby={priceError ? 'price-range-error' : undefined} onChange={event => setRangeDraft({ source, value: [range[0], event.target.value] })} /></label>
                    {priceError && <p id="price-range-error" role="alert" className="text-xs text-[#E89B55]">{priceError}</p>}
                    <Button type="submit">Aplicar faixa</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Button
              type="button"
              onClick={handleApply}
              className="mt-1 h-9 w-full bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-mono text-xs font-bold uppercase tracking-wider rounded-[6px]"
            >
              Aplicar
            </Button>
            {priceError && !priceEditorOpen && <p role="alert" className="text-xs text-[#E89B55]">{priceError}</p>}
          </div>
        </div>

        {/* Network */}
        <div className="flex flex-col gap-3 border-t border-[#3F2319] pt-4">
          <h3 className="font-mono text-sm font-bold text-[#F5F1EB]">Rede</h3>
          <ul className="flex flex-col gap-1.5 font-mono text-xs">
            {networks.map((net) => {
              const isSelected = selectedNetwork.toLowerCase() === net.name.toLowerCase()
              return (
                <li
                  key={net.name}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectNetwork(isSelected ? '' : net.name)
                    }
                  }}
                  onClick={() => onSelectNetwork(isSelected ? '' : net.name)}
                  className={`flex cursor-pointer items-center justify-between py-1 transition-colors hover:text-[#E89B55] ${
                    isSelected ? 'font-bold text-[#E89B55]' : 'text-[#CFB28C]'
                  }`}
                >
                  <span>{net.name}</span>
                  <span className="font-bold">({net.count})</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="md:hidden"><label htmlFor="mobile-sort">Ordenar por</label><FormSelect id="mobile-sort" aria-label="Ordenar NFTs" value={selectedSort} onValueChange={value => onSortChange?.(value as 'recent' | 'price_asc' | 'price_desc')} className="mt-2" options={[{ value: 'recent', label: 'Mais recentes' }, { value: 'price_asc', label: 'Menor preço' }, { value: 'price_desc', label: 'Maior preço' }]} /></div>
      </div>
  )
  return (
    <aside className="catalog-filters flex w-full flex-col gap-4 md:w-[280px] lg:w-[310px]">
      {mobile ? <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="bottom" overlayClassName="mobile-filters-overlay z-[90]" className="mobile-filters-sheet z-[100] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-t-3xl" onCloseAutoFocus={event => { event.preventDefault(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="Filtros do catálogo"]')?.focus()) }}>
          <SheetTitle>Filtros do catálogo</SheetTitle><SheetDescription>Combine coleção, rede, preço e ordenação.</SheetDescription>
          {panel}
          <div className="flex items-center justify-between gap-4 pt-4"><Button variant="outline" onClick={onClearFilters}>Limpar filtros</Button><SheetClose asChild><Button>Ver resultados</Button></SheetClose></div>
        </SheetContent>
      </Sheet> : panel}
      <a className="featured-nft" href="/nfts/nft-2"><strong>NFT EM DESTAQUE</strong><span>OFERTA LIMITADA</span><img src="/assets/images/featured-banner.webp" alt="Sage Nomad em destaque" /></a>
    </aside>
  )
}
