import { AccountNav } from '@/components/AccountNav'
import { keys } from '@/lib/query-keys'
import { useActionNotice } from '@/components/ActionNotice'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/axios'
import { apiErrorMessage } from '@/lib/api-error'
import type { Wallet, NetworkType } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/toast'
import { FormSelect } from '@/components/FormSelect'
import { 
  MapPin,
  Check, 
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  RefreshCw
} from 'lucide-react'

export const Route = createFileRoute('/wallets')({
  component: WalletsPage,
})

function WalletsPage() {
  const showToast = useToast()
  const showNotice = useActionNotice()
  const { user, isAuthenticated, openAuthModal } = useAuth()
  const queryClient = useQueryClient()

  // Form states matching Figma desktop-carteiras.png
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [walletNickname, setWalletNickname] = useState('MetaMask Principal')
  const [network, setNetwork] = useState<NetworkType>('Ethereum')
  const [profileName, setProfileName] = useState(user?.name || '')
  const [address, setAddress] = useState('')
  const [secondaryEns, setSecondaryEns] = useState('')
  const [walletType, setWalletType] = useState('MetaMask')
  const [referralCode, setReferralCode] = useState('KURIO-2026')
  const [email] = useState(user?.email || 'alex@kurio.art')
  const [ensName, setEnsName] = useState(user?.ensName || user?.username.replace(/^@/, '') || '')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Query wallets from API
  const { data: wallets = [], isPending: isWalletsLoading, isFetching: isWalletsFetching, error: walletsError, refetch: refetchWallets } = useQuery<Wallet[]>({
    queryKey: keys.wallets(user?.id),
    queryFn: async ({ signal }) => {
      const res = await api.get<Wallet[]>('/wallets', { signal })
      return res.data
    },
    enabled: isAuthenticated,
  })

  // Add wallet mutation
  const addWalletMutation = useMutation({
    mutationFn: async (payload: { address: string; network: NetworkType; label: string; metadata: Wallet['metadata'] }) => {
      const res = editingId ? await api.patch(`/wallets/${editingId}`, payload) : await api.post('/wallets', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      showToast('Carteira salva com sucesso!', <Link to="/checkout">Continuar para pagamento</Link>)
      setErrorMsg('')
    },
    onError: (err: unknown) => {
      setErrorMsg(apiErrorMessage(err, 'Falha ao salvar carteira.'))
    },
  })

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const res = await api.patch(`/wallets/${walletId}`, { isPrimary: true })
      return res.data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.wallets(user?.id) }),
        queryClient.invalidateQueries({ queryKey: ['wallets'] }),
      ])
    },
  })

  // Delete mutation
  const deleteWalletMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const res = await api.delete(`/wallets/${walletId}`)
      return res.data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.wallets(user?.id) }),
        queryClient.invalidateQueries({ queryKey: ['wallets'] }),
      ])
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!address.trim()) {
      setErrorMsg('Informe o endereço da carteira.')
      return
    }

    addWalletMutation.mutate({
      address: address.trim(),
      network,
      label: walletNickname.trim(),
      metadata: { displayName, profileName, secondaryEns, walletType, referralCode, ensName },
    })
  }

  const editWallet = (wallet: Wallet) => {
    setEditingId(wallet.id); setAddress(wallet.address); setNetwork(wallet.network); setWalletNickname(wallet.label)
    if (wallet.metadata) {
      setDisplayName(wallet.metadata.displayName); setProfileName(wallet.metadata.profileName); setSecondaryEns(wallet.metadata.secondaryEns)
      setWalletType(wallet.metadata.walletType); setReferralCode(wallet.metadata.referralCode); setEnsName(wallet.metadata.ensName)
    }
    setErrorMsg('')
    document.getElementById('wallet-field-5')?.focus()
  }
  const newWallet = () => {
    setEditingId(null); setAddress(''); setErrorMsg('')
    document.getElementById('wallet-field-5')?.focus()
  }
  const copyAddress = async (addr: string, id: string) => {
    try {
      await navigator.clipboard.writeText(addr)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      showNotice({ title: 'Não foi possível copiar', description: 'O navegador não permitiu copiar o endereço. Selecione o endereço da carteira para copiá-lo manualmente.' })
    }
  }

  if (isAuthenticated && (isWalletsLoading || walletsError)) return <div className="account-page py-10">
    <div><div className="flex flex-col md:flex-row gap-10">
      <AccountNav activeTab="wallets" />
      <main className="flex-1"><h1 className="text-lg font-bold mb-8">Carteiras</h1>
        {walletsError ? <div role="alert"><p className="mb-4">{apiErrorMessage(walletsError, 'Não foi possível carregar as carteiras.')}</p><Button onClick={() => refetchWallets()}>Tentar novamente</Button></div>
          : <div role="status" aria-label="Carregando carteiras" className="grid grid-cols-1 md:grid-cols-2 gap-7">{Array.from({ length: 10 }, (_, index) => <div key={index} className="space-y-2"><div className="skeleton-shimmer h-5 w-32 rounded" /><div className="skeleton-shimmer h-10 rounded" /></div>)}</div>}
      </main>
    </div></div>
  </div>

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center font-mono">
        <div className="p-8 rounded-2xl bg-[#241612] border border-[#3F2319]">
          <MapPin className="w-16 h-16 text-[#D28A4C] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso às Carteiras</h1>
          <p className="text-[#CFB28C] mb-6 text-xs">
            Faça login na sua conta para gerenciar suas carteiras Web3 conectadas.
          </p>
          <Button 
            onClick={() => openAuthModal('login')}
            className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold"
          >
            Entrar na Conta
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="account-page min-h-screen bg-[#140D0A] text-[#F5F1EB] font-mono py-10">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Account Navigation (Desktop sidebar, mobile pills) */}
          <AccountNav activeTab="wallets" />

          {/* Right Main Content (Matching Figma desktop-carteiras.png) */}
          <main className="flex-1">
            <div className="border border-[#3F2319] bg-[#241612] rounded-xl p-8 shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-xl font-bold text-white">Carteira principal</h1>
                <button
                  type="button"
                  onClick={newWallet}
                  className="text-xs font-bold text-[#E89B55] hover:underline"
                >
                  Adicionar
                </button>
              </div>
              <p className="text-xs text-[#CFB28C] mb-6">
                Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
              </p>

              {errorMsg && (
                <div id="wallet-error" role="alert" className="p-3 mb-6 rounded-lg bg-[#241612] border border-[#D28A4C]/60 text-[#F5F1EB] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#D28A4C]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {(setPrimaryMutation.error || deleteWalletMutation.error) && <p role="alert" className="text-[#F0805F]">{apiErrorMessage(setPrimaryMutation.error || deleteWalletMutation.error, 'Não foi possível atualizar a carteira.')}</p>}
              {editingId && <p role="status" className="mb-3 text-sm text-[#E89B55]">Editando carteira. <button className="underline" onClick={newWallet}>Cancelar edição</button></p>}
              {/* Form matching Figma desktop-carteiras.png */}
              <form onSubmit={handleSave} className="space-y-6">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="wallet-field-1" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Nome de exibição*
                    </label>
                    <Input id="wallet-field-1" aria-describedby={errorMsg ? 'wallet-error' : undefined}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="Alex Rivera"
                      className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                    />
                  </div>

                  <div>
                    <label htmlFor="wallet-field-2" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Apelido da carteira*
                    </label>
                    <Input id="wallet-field-2" aria-describedby={errorMsg ? 'wallet-error' : undefined}
                      value={walletNickname}
                      onChange={(e) => setWalletNickname(e.target.value)}
                      required
                      placeholder="MetaMask Principal"
                      className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                    />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="wallet-field-3" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Rede *
                    </label>
                    <FormSelect id="wallet-field-3" aria-describedby={errorMsg ? 'wallet-error' : undefined}
                      value={network}
                      onValueChange={value => setNetwork(value as NetworkType)}
                      options={[{ value: 'Ethereum', label: 'Ethereum (Mainnet)' }, { value: 'Polygon', label: 'Polygon' }, { value: 'Solana', label: 'Solana' }]}
                    />
                  </div>

                  <div>
                    <label htmlFor="wallet-field-4" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Nome do perfil*
                    </label>
                    <Input id="wallet-field-4" aria-describedby={errorMsg ? 'wallet-error' : undefined}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Nome do perfil"
                      className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                    />
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="wallet-field-5" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Endereço da carteira*
                    </label>
                    <Input id="wallet-field-5"
                      required aria-describedby={errorMsg ? 'wallet-error' : undefined} value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Endereço 0x da carteira"
                      className="bg-[#140D0A] border-[#3F2319] text-white font-mono text-xs focus:border-[#D28A4C] h-10"
                    />
                  </div>

                  <div>
                    <label htmlFor="wallet-field-6" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      ENS ou carteira secundária (opcional)
                    </label>
                    <Input id="wallet-field-6" aria-describedby={errorMsg ? 'wallet-error' : undefined}
                      value={secondaryEns}
                      onChange={(e) => setSecondaryEns(e.target.value)}
                      placeholder="ENS ou carteira secundária (opcional)"
                      className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                    />
                  </div>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="wallet-field-7" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Tipo de carteira*
                    </label>
                    <FormSelect id="wallet-field-7" aria-describedby={errorMsg ? 'wallet-error' : undefined}
                      value={walletType}
                      onValueChange={setWalletType}
                      options={[{ value: 'MetaMask', label: 'MetaMask' }, { value: 'WalletConnect', label: 'WalletConnect' }, { value: 'Coinbase', label: 'Coinbase Wallet' }, { value: 'Ledger', label: 'Ledger Hardware' }]}
                    />
                  </div>

                  <div>
                    <label htmlFor="wallet-field-8" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Código de indicação*
                    </label>
                    <Input id="wallet-field-8" aria-describedby={errorMsg ? 'wallet-error' : undefined}
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Código de indicação"
                      className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                    />
                  </div>
                </div>

                {/* Row 5 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="wallet-field-9" className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      E-mail*
                    </label>
                    <Input id="wallet-field-9"
                      type="email"
                      value={email}
                      disabled
                      className="bg-[#140D0A]/70 border-[#3F2319] text-[#CFB28C]/60 h-10 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Nome ENS *
                    </label>
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-[#3F2319] bg-[#140D0A] text-xs text-[#CFB28C]">
                        .eth ▾
                      </span>
                      <Input
                        aria-label="Nome ENS" aria-describedby={errorMsg ? 'wallet-error' : undefined} value={ensName}
                        onChange={(e) => setEnsName(e.target.value)}
                        placeholder="alex.rivera"
                        className="bg-[#140D0A] border-[#3F2319] text-white rounded-l-none focus:border-[#D28A4C] h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={addWalletMutation.isPending}
                    className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold px-8 h-10"
                  >
                    Salvar carteira
                  </Button>
                </div>
              </form>

              {/* Secondary Wallet Section (Matching Figma desktop-carteiras.png) */}
              <div className="secondary-wallets mt-12 pt-8 border-t border-[#3F2319]">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-white">Carteira secundária</h2>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <label className="flex items-center gap-2 cursor-pointer text-[#CFB28C]">
                      <input type="radio" name="secondary-wallet" checked={!!editingId && wallets.find(wallet => wallet.id === editingId)?.isPrimary === true} onChange={() => { const primary = wallets.find(wallet => wallet.isPrimary); if (primary) editWallet(primary) }} className="accent-[#D28A4C]" />
                      <span>Igual à carteira principal</span>
                    </label>
                    <button type="button" onClick={newWallet} className="text-[#E89B55] hover:underline font-bold">
                      Adicionar
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#CFB28C]/70">
                  {wallets.length > 1
                    ? `${wallets.length} carteiras vinculadas à sua conta.`
                    : 'Você ainda não adicionou uma carteira secundária.'}
                </p>

                {/* Background Sync Indicator */}
                {isWalletsFetching && !isWalletsLoading && (
                  <div className="wallets-sync-indicator mt-3 inline-flex items-center gap-2 rounded-full border border-[#3F2319] bg-[#241612] px-3 py-1 text-xs text-[#D28A4C] animate-pulse">
                    <RefreshCw className="h-3 w-3 animate-spin text-[#E89B55]" />
                    <span>Atualizando carteiras em segundo plano...</span>
                  </div>
                )}

                {/* Connected Wallets List or Loading/Error States */}
                {isWalletsLoading ? (
                  <div className="mt-4 space-y-3" role="status" aria-label="Carregando carteiras">
                    <div className="h-14 skeleton-shimmer rounded-lg" />
                    <div className="h-14 skeleton-shimmer rounded-lg" />
                  </div>
                ) : walletsError ? (
                  <div className="mt-4 p-4 rounded-lg border border-red-500/30 bg-[#241612] text-xs text-[#F0805F] flex items-center justify-between" role="alert">
                    <span>Não foi possível carregar as carteiras cadastradas.</span>
                    <button type="button" onClick={() => refetchWallets()} className="underline font-bold text-[#E89B55] cursor-pointer">
                      Tentar novamente
                    </button>
                  </div>
                ) : wallets.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {wallets.map((w) => (
                      <div
                        key={w.id}
                        className="saved-wallet p-3.5 rounded-lg bg-[#140D0A] border border-[#3F2319] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white">{w.label}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#241612] text-[#D28A4C] border border-[#3F2319]">
                            {w.network}
                          </span>
                          <span className="text-[#CFB28C] truncate max-w-[140px] sm:max-w-none">
                            {w.address.slice(0, 10)}...{w.address.slice(-6)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#E89B55]">{w.balanceEth} ETH</span>
                          <button
                            type="button"
                            aria-label={`Copiar endereço de ${w.label}`} onClick={() => copyAddress(w.address, w.id)}
                            className="text-[#CFB28C] hover:text-white"
                          >
                            {copiedId === w.id ? <Check className="w-3.5 h-3.5 text-[#D28A4C]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button type="button" aria-label={`Explorar carteira ${w.label}`} onClick={() => showNotice({ title: 'Carteira simulada', description: 'Os endereços desta demonstração são fictícios. Não há um registro real para consultar em um explorador de blockchain.' })}
                            className="text-[#CFB28C] hover:text-[#D28A4C]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" aria-label={`Editar ${w.label}`} onClick={() => editWallet(w)} className="text-[#E89B55] underline">Editar</button>
                          {!w.isPrimary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryMutation.mutate(w.id)}
                              className="text-[10px] text-[#D28A4C] hover:underline"
                            >
                              Tornar principal
                            </button>
                          )}
                          {wallets.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Remover ${w.label}`} onClick={() => deleteWalletMutation.mutate(w.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 p-6 rounded-lg border border-[#3F2319] bg-[#140D0A] text-center text-xs text-[#CFB28C]">
                    Nenhuma carteira cadastrada. Adicione sua primeira carteira acima.
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
