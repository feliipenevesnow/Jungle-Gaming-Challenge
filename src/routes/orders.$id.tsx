import { keys } from '@/lib/query-keys'
import { clearAttempt } from '@/lib/purchase'
import { clearCheckoutDraft } from '@/lib/checkout-draft'
import { useAuth } from '@/lib/auth'
import { useActionNotice } from '@/components/ActionNotice'
import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api } from '@/lib/axios'
import type { Order } from '@/types/api'
import { subscribeToOrderUpdates } from '@/lib/socket'
import { X, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/orders/$id')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const showNotice = useActionNotice()
  const { user } = useAuth()
  const { id } = useParams({ from: '/orders/$id' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: order, isLoading, isFetching, isError, refetch } = useQuery<Order>({
    queryKey: keys.order(user?.id, id),
    queryFn: async ({ signal }) => {
      const res = await api.get(`/orders/${id}`, { signal })
      return res.data
    },
    refetchInterval: (query) => {
      return query.state.data?.status === 'PENDING' ? 2000 : false
    },
  })

  useEffect(() => {
    if (order && user) {
      if (order.status !== 'PENDING') clearAttempt(user.id)
      if (order.status === 'CONFIRMED') clearCheckoutDraft(user.id)
    }
  }, [order, user])

  // Real-time updates via Socket.IO
  useEffect(() => {
    const unsubscribe = subscribeToOrderUpdates(id, (event) => {
      queryClient.setQueryData(keys.order(user?.id, id), (old: Order | undefined) => {
        if (!old || old.status !== 'PENDING' || event.version <= old.version) return old
        return {
          ...old,
          status: event.status,
          version: event.version,
          receipt: event.receipt || old.receipt,
          updatedAt: new Date().toISOString(),
        }
      })
    })

    return () => {
      unsubscribe()
    }
  }, [id, user?.id, queryClient])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#140D0A] flex items-center justify-center p-4">
        <div className="w-full max-w-[580px] bg-[#241612] border border-[#3F2319] rounded-2xl p-10 text-center">
          <div className="skeleton-shimmer w-16 h-16 bg-[#3F2319] rounded-full mx-auto mb-4" />
          <div className="skeleton-shimmer h-5 w-48 bg-[#3F2319] mx-auto rounded mb-2" />
          <div className="skeleton-shimmer h-4 w-64 bg-[#3F2319]/60 mx-auto rounded" />
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-[#140D0A] flex items-center justify-center p-4 font-mono">
        <div className="w-full max-w-md bg-[#241612] border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Pedido Não Encontrado</h1>
          <p className="text-[#CFB28C] text-xs mb-6">
            Não foi possível localizar os dados do pedido com identificador <code>{id}</code>.
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => refetch()} variant="outline" className="border-[#3F2319] text-[#CFB28C] text-xs">
              Tentar novamente
            </Button>
            <Link to="/">
              <Button className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] text-xs font-bold">
                Voltar ao Catálogo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (order.status !== 'CONFIRMED') {
    return (
      <div className="order-status page-width py-16 flex flex-col items-center text-center font-mono">
        <h1 className="text-2xl font-bold mb-4">{order.status === 'PENDING' ? 'Processando seu pedido' : 'Pagamento recusado'}</h1>
        <p role="status" className="max-w-md text-xs text-[#CFB28C] mb-6">
          {order.status === 'PENDING' ? 'Aguardando a confirmação da transação na rede blockchain. Você pode permanecer nesta tela ou retornar mais tarde.' : 'A compra não foi confirmada. Seus NFTs continuam no carrinho.'}
        </p>
        {order.status === 'PENDING' && isFetching && (
          <div className="order-sync-indicator mb-6 inline-flex items-center gap-2 rounded-full border border-[#3F2319] bg-[#241612] px-3.5 py-1 text-xs text-[#D28A4C] animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#E89B55]" />
            <span>Sincronizando status do pedido em segundo plano...</span>
          </div>
        )}
        <Link to="/cart" className="inline-flex items-center gap-2 rounded bg-[#D28A4C] px-6 py-2.5 text-xs font-bold uppercase text-[#140D0A] hover:bg-[#E89B55]">
          Voltar ao carrinho
        </Link>
      </div>
    )
  }
  const txHash = order.receipt?.transactionHash || 'Indisponível'

  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4).toUpperCase()}`
  const formattedDate = new Date(order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const payerWallet = order.walletAddress ? `${order.walletAddress.slice(0, 6)}...${order.walletAddress.slice(-4)}` : 'MetaMask'
  const explorerName = order.network === 'Ethereum' ? 'Etherscan' : order.network === 'Polygon' ? 'Polygonscan' : 'Solscan'

  return (
    <div className="order-page font-mono">
      {/* Modal Card Matching Figma desktop-confirmacao-pedido.png */}
      <div className="order-receipt relative w-full max-w-[580px] bg-[#241612] border border-[#3F2319] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => navigate({ to: '/' })}
          aria-label="Fechar"
          className="absolute right-4 top-4 text-[#CFB28C] hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 md:p-10">
          {/* Top Thank You Graphic (Envelope with THANK YOU letter) */}
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <svg className="receipt-thanks" width="80" height="80" viewBox="0 0 80 80" fill="none" aria-label="Obrigado pela compra"><g stroke="#D28A4C" strokeWidth="2.2" strokeLinejoin="round"><path d="M8 33 14 26M66 26l6 7v45H8V33M30 7l5-5h10l5 5" /><path d="M14 39V7h52v32M8 33l23 24m18 0 23-24M8 78l28-31a6 6 0 0 1 8 0l28 31" /></g><text x="40" y="25" fill="#D28A4C" textAnchor="middle" fontSize="13" fontWeight="700">THANK</text><text x="40" y="39" fill="#D28A4C" textAnchor="middle" fontSize="13" fontWeight="700">YOU</text></svg>
            <h1 className="text-sm md:text-base font-medium text-[#F5F1EB]">
              Seus NFTs agora estão na sua carteira
            </h1>
          </div>

          {/* 4-Columns Transaction Summary Row (Matching Figma desktop-confirmacao-pedido.png) */}
          <div className="grid grid-cols-4 gap-2 py-4 border-y border-[#3F2319] text-center mb-6">
            <div className="border-r border-[#3F2319] pr-1">
              <span className="text-[10px] text-[#CFB28C]/70 block mb-1">ID da transação</span>
              <span className="text-[11px] font-bold text-white truncate block">{shortHash}</span>
            </div>
            <div className="border-r border-[#3F2319] px-1">
              <span className="text-[10px] text-[#CFB28C]/70 block mb-1">Data</span>
              <span className="text-[11px] font-bold text-white block">{formattedDate}</span>
            </div>
            <div className="border-r border-[#3F2319] px-1">
              <span className="text-[10px] text-[#CFB28C]/70 block mb-1">Total</span>
              <span className="text-[11px] font-bold text-white block">{order.totalEth} ETH</span>
            </div>
            <div className="pl-1">
              <span className="text-[10px] text-[#CFB28C]/70 block mb-1">Carteira</span>
              <span className="text-[11px] font-bold text-white truncate block">{payerWallet}</span>
            </div>
          </div>

          {/* Transaction Details Table */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-[#F5F1EB] mb-3">Detalhes da transação</h2>

            {/* Table Header */}
            <div className="flex items-center justify-between text-[10px] text-[#CFB28C]/70 border-b border-[#3F2319] pb-2 mb-3">
              <span className="flex-1">NFTs</span>
              <span className="w-20 text-center">Edições</span>
              <span className="w-24 text-right">Subtotal</span>
            </div>

            {/* Items */}
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover border border-[#3F2319] bg-[#140D0A] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-[#CFB28C]/70">
                        ID do token: {item.tokenId || `#${(item.name.split('#')[1] || '').padStart(4, '0')}`}
                      </p>
                    </div>
                  </div>

                  <div className="w-20 text-center text-[#CFB28C] text-xs">
                    (x {item.quantity})
                  </div>

                  <div className="w-24 text-right font-bold text-[#E89B55] text-xs">
                    {item.subtotalEth} ETH
                  </div>
                </div>
              ))}
            </div>

            {/* Network Fee & Total Rows */}
            <div className="mt-6 pt-4 border-t border-[#3F2319] space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#CFB28C]">
                <span>Taxa de rede</span>
                <span className="font-mono text-white">{order.networkFeeEth} ETH</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-white">Total</span>
                <span className="text-lg font-black text-[#E89B55]">{order.totalEth} ETH</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-[11px] text-[#CFB28C]/80 text-center leading-relaxed mb-6">
            Transação confirmada na rede {order.network}. A propriedade foi transferida para sua carteira conectada na simulação.
          </p>

          {/* Action Button: Ver no Etherscan */}
          <div className="flex justify-center">
            <div className="order-explorer w-full sm:w-auto">
              <Button onClick={() => showNotice({ title: 'Transação simulada', description: `Este pedido foi confirmado na simulação. A referência ${order.receipt?.transactionHash ?? order.id} não corresponde a uma transação publicada em blockchain.` })} className="w-full sm:w-auto bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold px-8 h-10 gap-2">
                Ver no {explorerName}
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* 10px Decorative Bottom Bar matching Figma design */}
        <div className="h-[10px] w-full bg-[#D28A4C]" />
      </div>
    </div>
  )
}
