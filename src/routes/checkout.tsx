import { keys } from '@/lib/query-keys'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ShoppingBag, ArrowLeft, ChevronLeft, Wallet, MoreVertical } from 'lucide-react'
import { api } from '@/lib/axios'
import { isAxiosError } from 'axios'
import { subscribeToNftUpdates } from '@/lib/socket'
import { readAttempt, saveAttempt, clearAttempt, type PurchaseAttempt } from '@/lib/purchase'
import { readCheckoutDraft, saveCheckoutDraft } from '@/lib/checkout-draft'
import { apiErrorMessage } from '@/lib/api-error'
import { CouponForm } from '@/components/CouponForm'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormSelect } from '@/components/FormSelect'
import { SummarySkeleton } from '@/components/SummarySkeleton'
import { CheckoutLoading } from '@/components/CheckoutLoading'
import { useMediaQuery } from '@/lib/use-media-query'
import type { CartState, Wallet as WalletType, NetworkType, QuoteResponse, Order } from '@/types/api'

export const Route = createFileRoute('/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: isAuthLoading, openAuthModal } = useAuth()
  const [initialDraft] = useState(() => user ? readCheckoutDraft(user.id) : null)

  const mobile = useMediaQuery('(max-width: 767px)')
  const [collectorOpen, setCollectorOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Selected payment options
  const [networkOverride, setSelectedNetwork] = useState<NetworkType | null>(initialDraft?.networkOverride ?? null)
  const [selectedWalletProvider, setSelectedWalletProvider] = useState(initialDraft?.selectedWalletProvider ?? 'Coinbase Wallet')
  const [useOtherWallet, setUseOtherWallet] = useState(initialDraft?.useOtherWallet ?? false)
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(initialDraft?.selectedWalletId ?? null)
  const [collectorNote, setCollectorNote] = useState(initialDraft?.collectorNote ?? '')
  const [storedAttempt, setSavedAttempt] = useState(() => user ? readAttempt(user.id) : null)
  const [reviewRequired, setReviewRequired] = useState(false)
  const [connectedWalletId, setConnectedWalletId] = useState<string | null>(null)
  const submitting = useRef(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Collector fields matching desktop-pagamento.png
  const [displayName, setDisplayName] = useState(initialDraft?.displayName ?? user?.name ?? '')
  const [username, setUsername] = useState(initialDraft?.username ?? user?.username ?? '')
  const [profileName, setProfileName] = useState(initialDraft?.profileName ?? user?.name ?? '')
  const [ensOrSecondary, setEnsOrSecondary] = useState(initialDraft?.ensOrSecondary ?? '')
  const [walletType, setWalletType] = useState(initialDraft?.walletType ?? 'MetaMask')
  const [referralCode, setReferralCode] = useState(initialDraft?.referralCode ?? 'KURIO-2026')
  const [ensName, setEnsName] = useState(initialDraft?.ensName ?? user?.ensName ?? user?.username.replace(/^@/, '') ?? '')

  const draftOwner = user?.id
  useEffect(() => {
    if (draftOwner) saveCheckoutDraft(draftOwner, { displayName, username, profileName, ensOrSecondary, walletType, referralCode, ensName, collectorNote, networkOverride, selectedWalletProvider, selectedWalletId, useOtherWallet })
  }, [draftOwner, displayName, username, profileName, ensOrSecondary, walletType, referralCode, ensName, collectorNote, networkOverride, selectedWalletProvider, selectedWalletId, useOtherWallet])

  // Query Cart
  const { data: cart, isLoading: isCartLoading, error: cartError, refetch: refetchCart } = useQuery<CartState>({
    queryKey: keys.cart(user?.id),
    queryFn: async ({ signal }) => {
      const res = await api.get<CartState>('/cart', { signal })
      return res.data
    },
  })

  // Query Wallets
  const { data: wallets = [], isPending: isWalletsLoading, error: walletsError, refetch: refetchWallets } = useQuery<WalletType[]>({
    queryKey: keys.wallets(user?.id),
    queryFn: async ({ signal }) => {
      if (!isAuthenticated) return []
      const res = await api.get<WalletType[]>('/wallets', { signal })
      return res.data
    },
    enabled: isAuthenticated,
  })

  const primaryWallet = wallets.find(w => w.id === selectedWalletId) || wallets.find((w) => w.isPrimary) || wallets[0]
  const walletAddress = primaryWallet?.address || ''

  const selectedNetwork = networkOverride || primaryWallet?.network || 'Ethereum'
  const cartItems = useMemo(() => cart?.items || [], [cart])
  useEffect(() => subscribeToNftUpdates(event => {
    if (cartItems.some(item => item.nftId === event.resourceId)) {
      setReviewRequired(true)
      setPaymentError('Preço ou disponibilidade atualizado. Revise a nova cotação antes de confirmar.')
    }
  }), [cartItems])

  // Revalidate Quote
  const { data: quote, error: quoteError, isFetching: isQuoteLoading, refetch: refetchQuote } = useQuery<QuoteResponse>({
    queryKey: keys.checkoutQuote(user?.id, { items: cartItems, network: selectedNetwork, couponCode: cart?.couponCode }),
    queryFn: async ({ signal }) => {
      const res = await api.post('/cart/quote', {
        items: cartItems.map((item) => ({
          nftId: item.nftId,
          quantity: item.quantity,
          edition: item.edition,
        })),
        network: selectedNetwork,
        couponCode: cart?.couponCode,
      }, { signal })
      return res.data
    },
    enabled: cartItems.length > 0,
  })

  const goToOrder = (order: Order) => {
    if (user && order.status !== 'PENDING') { clearAttempt(user.id); setSavedAttempt(null) }
    queryClient.setQueryData(['order', user?.id, order.id], order)
    void queryClient.invalidateQueries({ queryKey: ['cart'] })
    navigate({ to: '/orders/$id', params: { id: order.id } })
  }
  const recovery = useQuery({
    queryKey: keys.attempt(user?.id, storedAttempt?.key),
    queryFn: async ({ signal }) => {
      try { return (await api.get<Order>(`/orders/by-key/${storedAttempt!.key}`, { signal })).data }
      catch (error) { if (user && isAxiosError(error) && error.response?.status === 404) clearAttempt(user.id); throw error }
    },
    enabled: !!storedAttempt && !!user,
    retry: false,
  })
  const savedAttempt = isAxiosError(recovery.error) && recovery.error.response?.status === 404 ? null : storedAttempt
  useEffect(() => {
    if (recovery.data) navigate({ to: '/orders/$id', params: { id: recovery.data.id } })
  }, [recovery.data, navigate])
  const connection = useMutation({
    mutationFn: async (provider: string) => {
      if (!primaryWallet) throw new Error('Cadastre uma carteira para continuar.')
      return (await api.post(`/wallets/${primaryWallet.id}/connect`, { provider })).data as { connected: boolean }
    },
    onSuccess: () => { setConnectedWalletId(primaryWallet?.id || null); setPaymentError(null) },
    onError: (error: unknown) => setPaymentError(apiErrorMessage(error, 'Não foi possível conectar a carteira.')),
  })
  const createOrderMutation = useMutation({
    mutationFn: async (attempt: PurchaseAttempt) => (await api.post<Order>('/orders', attempt.payload, { headers: { 'Idempotency-Key': attempt.key } })).data,
    onSuccess: goToOrder,
    onError: async (error: unknown, attempt) => {
      try { const existing = await api.get<Order>(`/orders/by-key/${attempt.key}`); goToOrder(existing.data); return } catch { /* Keep the same attempt for retry or refresh. */ }
      if (user && isAxiosError(error) && error.response && [400, 409, 422].includes(error.response.status)) { clearAttempt(user.id); setSavedAttempt(null) }
      setPaymentError(apiErrorMessage(error, 'Não foi possível obter a resposta. Tente novamente para recuperar o mesmo pedido.'))
    },
  })
  const validateCollector = () => {
    const required = [
      ['checkout-field-1', displayName, 'Informe o nome de exibição.'],
      ['checkout-field-2', username, 'Informe o nome de usuário.'],
      ['checkout-field-4', profileName, 'Informe o nome do perfil.'],
      ['checkout-field-8', referralCode, 'Informe o código de indicação.'],
      ['checkout-field-11', ensName, 'Informe o nome ENS.'],
    ]
    const errors = Object.fromEntries(required.filter(([, value]) => !value.trim()).map(([id, , message]) => [id, message]))
    if (username.trim() && !/^@?[\p{L}\p{N}_.-]{2,40}$/u.test(username.trim())) errors['checkout-field-2'] = 'Use de 2 a 40 letras, números, ponto, hífen ou sublinhado.'
    setFieldErrors(errors)
    const first = Object.keys(errors)[0]
    if (!first) return true
    setPaymentError('Revise os campos indicados nos dados do colecionador.')
    if (mobile) setCollectorOpen(true)
    else requestAnimationFrame(() => document.getElementById(first)?.focus())
    return false
  }
  const handleConfirm = async () => {
    if (submitting.current || !user) return
    submitting.current = true
    setPaymentError(null)
    try {
      if (savedAttempt) { await createOrderMutation.mutateAsync(savedAttempt); return }
      if (!validateCollector()) return
      if (!primaryWallet) { setPaymentError('Cadastre uma carteira para continuar.'); return }
      if (primaryWallet.network !== selectedNetwork) { setPaymentError('Selecione a mesma rede da carteira escolhida.'); return }
      const latest = await refetchQuote()
      if (latest.error || !latest.data?.valid) { setPaymentError(latest.data?.warnings?.join(' ') || apiErrorMessage(latest.error, 'Revise os itens e o cupom antes de confirmar.')); return }
      if (reviewRequired || JSON.stringify(latest.data) !== JSON.stringify(quote)) {
        setReviewRequired(false); setPaymentError('A cotação foi atualizada. Revise os valores e confirme novamente.'); return
      }
      if (connectedWalletId !== primaryWallet.id) await connection.mutateAsync(selectedWalletProvider)
      const attempt: PurchaseAttempt = { key: crypto.randomUUID(), payload: {
        items: cartItems.map(({ nftId, edition, quantity }) => ({ nftId, edition, quantity })),
        walletAddress, network: selectedNetwork, couponCode: cart?.couponCode, expectedTotalEth: latest.data.totalEth,
        quoteSignature: JSON.stringify(latest.data),
        collector: { displayName, username, profileName, referralCode, ensName, walletType, email: user.email, secondaryWallet: ensOrSecondary },
        note: collectorNote,
      } }
      saveAttempt(user.id, attempt); setSavedAttempt(attempt)
      await createOrderMutation.mutateAsync(attempt)
    } catch { /* The mutation retains the API error and idempotent attempt. */ }
    finally { submitting.current = false }
  }

  if (isAuthLoading) return <p role="status" className="page-width">Recuperando sua sessão...</p>

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#140D0A] flex items-center justify-center p-4 font-mono">
        <div className="w-full max-w-md bg-[#241612] border border-[#3F2319] rounded-2xl p-8 text-center shadow-2xl">
          <h2 className="text-xl font-bold text-[#F5F1EB] mb-2">Autenticação necessária</h2>
          <p className="text-xs text-[#CFB28C] leading-relaxed mb-6">
            Para revisar seus dados, conectar sua carteira e finalizar a compra, faça login na sua conta.
          </p>
          <Button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-xs"
          >
            Entrar / Criar conta
          </Button>
        </div>
      </div>
    )
  }

  if (cartError || walletsError) return <div className="checkout-page page-width py-10" role="alert">
    <Link to="/cart" className="inline-flex items-center gap-2 mb-6 text-[#CFB28C]"><ChevronLeft size={20} />Voltar ao carrinho</Link>
    <h1 className="text-xl font-bold mb-3">Não foi possível carregar o pagamento</h1>
    <p className="mb-5">{apiErrorMessage(cartError || walletsError, 'Confira sua conexão e tente novamente.')}</p>
    <Button onClick={() => { void refetchCart(); void refetchWallets() }}>Tentar novamente</Button>
  </div>
  if (isCartLoading || isWalletsLoading) return <CheckoutLoading />

  if (cartItems.length === 0 && !isCartLoading) {
    return (
      <div className="min-h-screen bg-[#140D0A] flex items-center justify-center p-4 font-mono">
        <div className="w-full max-w-md bg-[#241612] border border-[#3F2319] rounded-2xl p-8 text-center shadow-2xl">
          <ShoppingBag className="w-12 h-12 text-[#3F2319] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#F5F1EB] mb-2">Seu carrinho está vazio</h2>
          <p className="text-xs text-[#CFB28C] mb-6">Adicione obras ao carrinho para realizar o pagamento.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#D28A4C] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
          </Link>
        </div>
      </div>
    )
  }

  const subtotalEth = quote?.subtotalEth || cart?.subtotalEth || '—'
  const discountEth = quote?.discountEth || cart?.discountEth || '0.00'
  const networkFeeEth = quote?.networkFeeEth || cart?.networkFeeEth || '0.016'
  const totalEth = quote?.totalEth || cart?.totalEth || '—'

  const collectorFields = (
<div className={mobile ? "collector-dialog-fields" : "collector-form flex flex-col gap-6"}>
            <h1 className="text-xl font-bold text-white mb-2">Perfil do colecionador</h1>

            <div className="space-y-5">
              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-field-1" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    Nome de exibição*
                  </label>
                  <Input id="checkout-field-1" aria-invalid={Boolean(fieldErrors['checkout-field-1'])} aria-describedby={fieldErrors['checkout-field-1'] ? 'checkout-field-1-error' : paymentError ? 'checkout-error' : undefined}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                  />
                    {fieldErrors['checkout-field-1'] && <p id="checkout-field-1-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-1']}</p>}
                </div>

                <div>
                  <label htmlFor="checkout-field-2" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    Nome de usuário*
                  </label>
                  <Input id="checkout-field-2" aria-invalid={Boolean(fieldErrors['checkout-field-2'])} aria-describedby={fieldErrors['checkout-field-2'] ? 'checkout-field-2-error' : paymentError ? 'checkout-error' : undefined}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                  />
                    {fieldErrors['checkout-field-2'] && <p id="checkout-field-2-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-2']}</p>}
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-field-3" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    Rede *
                  </label>
                  <FormSelect id="checkout-field-3" aria-invalid={Boolean(fieldErrors['checkout-field-3'])} aria-describedby={fieldErrors['checkout-field-3'] ? 'checkout-field-3-error' : paymentError ? 'checkout-error' : undefined}
                    value={selectedNetwork}
                    onValueChange={value => setSelectedNetwork(value as NetworkType)}
                    options={[{ value: 'Ethereum', label: 'Ethereum (Mainnet)' }, { value: 'Polygon', label: 'Polygon' }, { value: 'Solana', label: 'Solana' }]}
                  />
                    {fieldErrors['checkout-field-3'] && <p id="checkout-field-3-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-3']}</p>}
                </div>

                <div>
                  <label htmlFor="checkout-field-4" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    Nome do perfil*
                  </label>
                  <Input id="checkout-field-4" aria-invalid={Boolean(fieldErrors['checkout-field-4'])} aria-describedby={fieldErrors['checkout-field-4'] ? 'checkout-field-4-error' : paymentError ? 'checkout-error' : undefined}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                  />
                    {fieldErrors['checkout-field-4'] && <p id="checkout-field-4-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-4']}</p>}
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-field-5" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    Endereço da carteira*
                  </label>
                  <Input id="checkout-field-5" aria-invalid={Boolean(fieldErrors['checkout-field-5'])} aria-describedby={fieldErrors['checkout-field-5'] ? 'checkout-field-5-error' : paymentError ? 'checkout-error' : undefined}
                    value={walletAddress}
                    readOnly
                    className="bg-[#140D0A]/70 border-[#3F2319] text-white font-mono text-xs h-10 cursor-not-allowed"
                  />
                    {fieldErrors['checkout-field-5'] && <p id="checkout-field-5-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-5']}</p>}
                </div>

                <div>
                  <label htmlFor="checkout-field-6" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    ENS ou carteira secundária (opcional)
                  </label>
                  <Input id="checkout-field-6" aria-invalid={Boolean(fieldErrors['checkout-field-6'])} aria-describedby={fieldErrors['checkout-field-6'] ? 'checkout-field-6-error' : paymentError ? 'checkout-error' : undefined}
                    value={ensOrSecondary}
                    onChange={(e) => setEnsOrSecondary(e.target.value)}
                    placeholder="ENS ou carteira secundária (opcional)"
                    className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                  />
                    {fieldErrors['checkout-field-6'] && <p id="checkout-field-6-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-6']}</p>}
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-field-7" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    Tipo de carteira*
                  </label>
                  <FormSelect id="checkout-field-7" aria-invalid={Boolean(fieldErrors['checkout-field-7'])} aria-describedby={fieldErrors['checkout-field-7'] ? 'checkout-field-7-error' : paymentError ? 'checkout-error' : undefined}
                    value={walletType}
                    onValueChange={setWalletType}
                    options={[{ value: 'MetaMask', label: 'MetaMask' }, { value: 'Coinbase', label: 'Coinbase Wallet' }, { value: 'WalletConnect', label: 'WalletConnect' }]}
                  />
                    {fieldErrors['checkout-field-7'] && <p id="checkout-field-7-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-7']}</p>}
                </div>

                <div>
                  <label htmlFor="checkout-field-8" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    Código de indicação*
                  </label>
                  <Input id="checkout-field-8" aria-invalid={Boolean(fieldErrors['checkout-field-8'])} aria-describedby={fieldErrors['checkout-field-8'] ? 'checkout-field-8-error' : paymentError ? 'checkout-error' : undefined}
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                  />
                    {fieldErrors['checkout-field-8'] && <p id="checkout-field-8-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-8']}</p>}
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkout-field-9" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    E-mail*
                  </label>
                  <Input id="checkout-field-9" aria-invalid={Boolean(fieldErrors['checkout-field-9'])} aria-describedby={fieldErrors['checkout-field-9'] ? 'checkout-field-9-error' : paymentError ? 'checkout-error' : undefined}
                    type="email"
                    value={user?.email || 'contato@email.com'}
                    disabled
                    className="bg-[#140D0A]/70 border-[#3F2319] text-[#CFB28C]/60 h-10 cursor-not-allowed"
                  />
                    {fieldErrors['checkout-field-9'] && <p id="checkout-field-9-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-9']}</p>}
                </div>

                <div>
                  <label htmlFor="checkout-field-11" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                    Nome ENS *
                  </label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-[#3F2319] bg-[#140D0A] text-xs text-[#CFB28C]">
                      .eth ▾
                    </span>
                    <Input id="checkout-field-11" aria-invalid={Boolean(fieldErrors['checkout-field-11'])} aria-describedby={fieldErrors['checkout-field-11'] ? 'checkout-field-11-error' : paymentError ? 'checkout-error' : undefined}
                      value={ensName}
                      onChange={(e) => setEnsName(e.target.value)}
                      placeholder="alex.rivera"
                      className="bg-[#140D0A] border-[#3F2319] text-white rounded-l-none focus:border-[#D28A4C] h-10"
                    />
                    {fieldErrors['checkout-field-11'] && <p id="checkout-field-11-error" className="mt-1 text-xs text-[#E89B55]">{fieldErrors['checkout-field-11']}</p>}
                  </div>
                </div>
              </div>

              {/* Radio: Usar outra carteira? */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#CFB28C] hover:text-white">
                  <input
                    type="checkbox"
                    checked={useOtherWallet}
                    onChange={(e) => setUseOtherWallet(e.target.checked)}
                    className="accent-[#D28A4C]"
                  />
                  <span>Usar outra carteira?</span>
                </label>
              </div>

              {useOtherWallet && <div className="space-y-2"><label htmlFor="checkout-wallet">Carteira cadastrada</label><FormSelect id="checkout-wallet" value={primaryWallet?.id || ''} onValueChange={value => { const wallet = wallets.find(item => item.id === value); if (wallet) { setSelectedWalletId(wallet.id); setSelectedNetwork(wallet.network) } }} placeholder="Selecione uma carteira" options={wallets.map(wallet => ({ value: wallet.id, label: `${wallet.label} — ${wallet.network}` }))} /><Link to="/wallets" className="text-[#E89B55] underline">Gerenciar carteiras</Link></div>}
              {/* Observação do colecionador (opcional) */}
              <div>
                <label htmlFor="checkout-field-10" className="text-xs text-[#CFB28C] block mb-1.5 font-medium">
                  Observação do colecionador (opcional)
                </label>
                <textarea id="checkout-field-10"
                  rows={4}
                  value={collectorNote}
                  onChange={(e) => setCollectorNote(e.target.value)}
                  placeholder="Instruções ou notas sobre a compra..."
                  className="w-full rounded-md bg-[#140D0A] border border-[#3F2319] p-3 text-xs text-white placeholder:text-[#CFB28C]/40 focus:outline-none focus:border-[#D28A4C] resize-none"
                />
              </div>
            </div>
          </div>
  )

  return (
    <div className="checkout-page min-h-screen bg-[#140D0A] text-[#F5F1EB] font-mono">
      <div className="page-width">
        <h1 className="mobile-page-heading"><Link to="/cart" aria-label="Voltar ao carrinho"><ChevronLeft /></Link>Pagamento com carteira</h1>
        {mobile && <div className="collector-mobile-review"><span>Dados do colecionador<br /><strong>{displayName}</strong></span><button type="button" onClick={() => setCollectorOpen(true)}>Revisar dados</button></div>}
        {mobile && <Dialog open={collectorOpen} onOpenChange={setCollectorOpen}><DialogContent className="collector-dialog max-h-[calc(100dvh-40px)] overflow-y-auto" onOpenAutoFocus={event => { const first = Object.keys(fieldErrors)[0]; if (first) { event.preventDefault(); requestAnimationFrame(() => document.getElementById(first)?.focus()) } }}>
          <DialogTitle>Dados do colecionador</DialogTitle><DialogDescription>Revise seus dados, a rede e a carteira antes de confirmar a compra.</DialogDescription>
          {collectorFields}
          <Button onClick={() => { if (validateCollector()) { setCollectorOpen(false); setPaymentError(null) } }}>Concluir revisão</Button>
        </DialogContent></Dialog>}
        <section className="connected-wallets"><div><h2>Carteira conectada</h2><Link to="/wallets">Trocar carteira</Link></div>{wallets.map(wallet => <label key={wallet.id} className="connected-wallet"><input type="radio" name="connected-wallet" checked={primaryWallet?.id === wallet.id} onChange={() => { setSelectedWalletId(wallet.id); setSelectedNetwork(wallet.network) }} /><span><strong>{wallet.isPrimary ? 'Principal' : 'Reserva'}</strong><span>{wallet.address.includes('.eth') ? wallet.address : `${wallet.address.slice(0,6)}…${wallet.address.slice(-4)}`}</span><span>Rede {wallet.network === 'Ethereum' ? 'principal Ethereum' : wallet.network}</span></span><MoreVertical size={18} /></label>)}{wallets.length === 0 && <Link to="/wallets">Adicionar uma carteira</Link>}</section>
        {/* Breadcrumb matching Figma desktop-pagamento.png */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#CFB28C]">
          <Link to="/" className="hover:text-[#E89B55]">Início</Link>
          <span>/</span>
          <Link to="/cart" className="hover:text-[#E89B55]">Mercado</Link>
          <span>/</span>
          <span className="text-[#F5F1EB] font-bold">Pagamento</span>
        </nav>

        {paymentError && (
          <div id="checkout-error" role="alert" aria-live="assertive" className="mb-6 flex items-start gap-3 rounded-xl border border-[#F0805F] bg-[#F0805F]/15 p-4 text-xs text-[#F0805F]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Aviso de pagamento</p>
              <p className="mt-0.5">{paymentError}</p>
            </div>
          </div>
        )}

        {/* 2-Columns Layout matching Figma desktop-pagamento.png */}
        <div className="checkout-layout">
          {/* Left Column: Perfil do Colecionador (7 cols) */}
          {!mobile && collectorFields}

          {/* Right Column: Seus NFTs & Resumo (5 cols) matching Figma desktop-pagamento.png */}
          <div className="checkout-summary flex flex-col gap-6">
            <h2 className="text-xl font-bold text-white mb-2">Seus NFTs</h2>

            {/* Table Header */}
            <div className="flex items-center justify-between text-xs text-[#CFB28C] border-b border-[#3F2319] pb-2">
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.nft.imageUrl}
                      alt={item.nft.name}
                      className="w-14 h-14 rounded-xl object-cover border border-[#3F2319] bg-[#140D0A]"
                    />
                    <div>
                      <h4 className="font-bold text-white">{item.nft.name}</h4>
                      <p className="text-[10px] text-[#CFB28C]/70">
                        ID do token: {item.nft.tokenId || '#0042'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[#CFB28C] text-[11px]">(x {item.quantity})</span>
                    <span className="font-bold text-[#E89B55] text-xs">{item.subtotalEth} ETH</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-coupon"><Dialog>
              <DialogTrigger className="pt-2 text-left text-xs text-[#E89B55] hover:underline">Tem um código promocional? Aplique aqui</DialogTrigger>
              <DialogContent className="max-w-[calc(100%-32px)] sm:max-w-md">
                <DialogTitle>Código promocional</DialogTitle>
                <DialogDescription>Aplique ou remova seu cupom antes de confirmar a compra.</DialogDescription>
                <CouponForm code={cart?.couponCode} invalidReason={cart?.couponError} />
              </DialogContent>
            </Dialog></div>

            {/* Financial Summary */}
            <div aria-busy={isQuoteLoading} className="financial-summary border-t border-[#3F2319] pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#CFB28C]">
                <span>Subtotal</span>
                <span className="text-white font-mono">{subtotalEth} ETH</span>
              </div>
              <div className="flex justify-between text-[#CFB28C]">
                <span>Desconto do lançamento</span>
                <span className="text-white font-mono">(-) {discountEth}</span>
              </div>
              <div className="flex justify-between text-[#CFB28C]">
                <div>
                  <span>Taxa de rede</span>
                  <span className="block text-[10px] text-[#CFB28C]/60">Taxa estimada</span>
                </div>
                <span className="text-white font-mono">{networkFeeEth} ETH</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-[#3F2319]">
                <span className="font-bold text-white text-sm">Total</span>
                <span className="text-xl font-black text-[#E89B55]">{totalEth} ETH</span>
              </div>
              {isQuoteLoading && <SummarySkeleton label="Atualizando cotação..." />}
            </div>

            <fieldset className="payment-providers"><legend>Carteira e rede</legend>{['WalletConnect','MetaMask','Coinbase Wallet'].map((provider,index) => <label key={provider} className="payment-provider"><span className="provider-icon">{index === 2 ? <Wallet size={20} /> : provider.charAt(0)}</span><span>{provider}</span><input type="radio" name="payment-provider" checked={selectedWalletProvider === provider} onChange={() => { setSelectedWalletProvider(provider); connection.mutate(provider) }} /></label>)}</fieldset>
            {connectedWalletId && <p role="status" className="text-xs text-[#CFB28C]">Carteira conectada. <button className="underline" onClick={async () => { try { await api.post('/wallets/disconnect'); setConnectedWalletId(null) } catch (error) { setPaymentError(apiErrorMessage(error, 'Não foi possível desconectar a carteira.')) } }}>Desconectar</button></p>}
            <div className="checkout-mobile-total">Total: <strong>{totalEth} ETH</strong></div>
            {!primaryWallet && <p role="status" className="text-sm text-[#CFB28C]">Cadastre uma carteira para confirmar a compra. <Link to="/wallets" className="text-[#E89B55] underline">Adicionar carteira</Link></p>}
            {quote?.warnings?.map(warning => <p role="alert" key={warning} className="text-xs text-[#F0805F]">{warning} <Link to="/cart" className="underline">Ajustar carrinho</Link></p>)}
            {quoteError && <p role="alert" className="text-xs text-[#F0805F]">{apiErrorMessage(quoteError, 'Não foi possível obter a cotação.')} <button onClick={() => refetchQuote()} className="underline">Tentar novamente</button></p>}
            {/* Submit Button */}
            <div className="checkout-submit pt-2">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={createOrderMutation.isPending || connection.isPending || recovery.isFetching || isQuoteLoading || !primaryWallet || (!savedAttempt && !quote?.valid)}
                className="w-full bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-sm h-12 rounded-xl"
              >
                {createOrderMutation.isPending ? 'Processando transação...' : connection.isPending ? 'Conectando carteira...' : 'Confirmar compra'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
