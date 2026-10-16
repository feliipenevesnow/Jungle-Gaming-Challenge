import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

export function CheckoutLoading() {
  return <div className="checkout-page"><div className="page-width" role="status" aria-label="Carregando pagamento">
    <h1 className="mobile-page-heading"><Link to="/cart" aria-label="Voltar ao carrinho"><ChevronLeft /></Link>Pagamento com carteira</h1>
    <div className="connected-wallets" aria-hidden="true">
      <div className="skeleton-shimmer h-5 w-48 rounded" />
      {[0, 1].map(index => <div key={index} className="skeleton-shimmer h-[93px] rounded-xl" />)}
    </div>
    <div className="checkout-layout" aria-hidden="true">
      <div className="collector-form flex flex-col gap-6">
        <div className="skeleton-shimmer h-6 w-64 rounded" />
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="grid grid-cols-2 gap-4">
          {[0, 1].map(column => <div key={column} className="space-y-2"><div className="skeleton-shimmer h-5 w-32 rounded" /><div className="skeleton-shimmer h-10 rounded" /></div>)}
        </div>)}
      </div>
      <div className="checkout-summary space-y-6">
        <div className="skeleton-shimmer h-6 w-40 rounded" />
        {[0, 1, 2].map(index => <div key={index} className="skeleton-shimmer h-14 rounded" />)}
        <div className="skeleton-shimmer h-40 rounded" />
        <div className="skeleton-shimmer h-12 rounded-full" />
      </div>
    </div>
  </div></div>
}
