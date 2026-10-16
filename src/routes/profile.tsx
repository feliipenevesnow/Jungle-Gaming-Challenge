import { keys } from '@/lib/query-keys'
import { AccountNav } from '@/components/AccountNav'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/axios'
import { apiErrorMessage } from '@/lib/api-error'
import type { User } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/lib/toast'
import { 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle,
  RefreshCw 
} from 'lucide-react'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useAuth()
  const query = useQuery({ queryKey: keys.profile(user?.id), queryFn: async ({ signal }) => (await api.get<User>('/profile', { signal })).data })
  if (query.isPending) return <div className="page-width py-16 skeleton-shimmer h-96" role="status" aria-label="Carregando perfil" />
  if (query.isError) return <div className="page-width py-16" role="alert"><p>{apiErrorMessage(query.error, 'Não foi possível carregar o perfil.')}</p><Button onClick={() => query.refetch()}>Tentar novamente</Button></div>
  return <ProfileForm initialProfile={query.data} isFetching={query.isFetching && !query.isPending} />
}
function ProfileForm({ initialProfile, isFetching }: { initialProfile: User; isFetching?: boolean }) {
  const showToast = useToast()
  const { user, isAuthenticated, openAuthModal, refreshUser } = useAuth()
  const queryClient = useQueryClient()

  // Form states matching Figma desktop-perfil.png
  const [displayName, setDisplayName] = useState(initialProfile.name || '')
  const [username, setUsername] = useState(initialProfile.username || '')
  const [email] = useState(initialProfile.email || '')
  const [ensName, setEnsName] = useState(initialProfile.ensName || '')
  const [walletNickname, setWalletNickname] = useState(initialProfile.walletNickname || '')
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl || '/assets/images/emerald-ape.webp')

  // Password fields with eye toggles
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Feedback messages
  const [errorMsg, setErrorMsg] = useState('')

  // Mutation to save profile
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Partial<User> & { currentPassword?: string; newPassword?: string }) => {
      const res = await api.patch('/profile', payload)
      return res.data
    },
    onSuccess: async (updatedUser: User) => {
      await refreshUser()
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      queryClient.setQueryData(keys.profile(user?.id), updatedUser)
      showToast('Perfil atualizado com sucesso!')
      setErrorMsg('')
    },
    onError: (err: unknown) => {
      setErrorMsg(apiErrorMessage(err, 'Falha ao salvar alterações.'))
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!displayName.trim()) {
      setErrorMsg('Nome de exibição é obrigatório.')
      return
    }

    if (newPassword || currentPassword) {
      if (!currentPassword) {
        setErrorMsg('Informe sua senha atual para alterar a senha.')
        return
      }
      if (newPassword.length < 6) {
        setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.')
        return
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('A confirmação de senha não confere.')
        return
      }

    }
    if (!/^@?[\p{L}\p{N}_.-]{2,40}$/u.test(username)) { setErrorMsg('Informe um nome de usuário válido.'); return }
    updateProfileMutation.mutate({ name: displayName.trim(), username: username.trim(), ensName: ensName.trim(), walletNickname: walletNickname.trim(), avatarUrl, ...(newPassword ? { currentPassword, newPassword } : {}) })

  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center font-mono">
        <div className="p-8 rounded-2xl bg-[#241612] border border-[#3F2319]">
          <UserIcon className="w-16 h-16 text-[#D28A4C] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Acesso ao Perfil</h1>
          <p className="text-[#CFB28C] mb-6 text-xs">
            Faça login na sua conta para acessar seus dados de colecionador.
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
          <AccountNav activeTab="profile" />

          {/* Right Main Content Form (Matching Figma desktop-perfil.png) */}
          <main className="flex-1">
            <div className="border border-[#3F2319] bg-[#241612] rounded-xl p-8 shadow-lg">
              <h1 className="text-xl font-bold text-white mb-6">Perfil do colecionador</h1>

              {/* Background Sync Indicator */}
              {isFetching && (
                <div className="profile-sync-indicator mb-4 inline-flex items-center gap-2 rounded-full border border-[#3F2319] bg-[#140D0A] px-3.5 py-1 text-xs text-[#D28A4C] animate-pulse">
                  <RefreshCw className="h-3 w-3 animate-spin text-[#E89B55]" />
                  <span>Atualizando perfil em segundo plano...</span>
                </div>
              )}

              {errorMsg && (
                <div id="profile-error" role="alert" className="p-3 mb-6 rounded-lg bg-[#241612] border border-[#D28A4C]/60 text-[#F5F1EB] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#D28A4C]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Nome de exibição*
                    </label>
                    <Input aria-label="Nome de exibição" aria-describedby={errorMsg ? 'profile-error' : undefined}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      placeholder="Seu nome completo"
                      className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Nome de usuário*
                    </label>
                    <Input aria-label="Nome de usuário" aria-describedby={errorMsg ? 'profile-error' : undefined}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ex: @alexrivera"
                      className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                    />
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      E-mail*
                    </label>
                    <Input aria-label="E-mail" aria-describedby={errorMsg ? 'profile-error' : undefined}
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
                      <Input aria-label="Nome ENS" aria-describedby={errorMsg ? 'profile-error' : undefined}
                        value={ensName}
                        onChange={(e) => setEnsName(e.target.value)}
                        placeholder="colecionador"
                        className="bg-[#140D0A] border-[#3F2319] text-white rounded-l-none focus:border-[#D28A4C] h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Wallet Nickname & Avatar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div>
                    <label className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Apelido da carteira*
                    </label>
                    <Input aria-label="Apelido da carteira" aria-describedby={errorMsg ? 'profile-error' : undefined}
                      value={walletNickname}
                      onChange={(e) => setWalletNickname(e.target.value)}
                      placeholder="ex: MetaMask Principal"
                      className="bg-[#140D0A] border-[#3F2319] text-white focus:border-[#D28A4C] h-10"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#CFB28C] block mb-2 font-medium">
                      Avatar
                    </label>
                    <div className="flex items-center gap-4">
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#D28A4C] bg-[#140D0A]"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const presets = [
                            '/assets/images/emerald-ape.webp',
                            '/assets/images/sage-nomad.webp',
                            '/assets/images/ivory-baron.webp',
                            '/assets/images/golden-beat.webp',
                          ]
                          const stem = (url: string) => url.replace(/\.(png|webp)$/, '')
                          const nextIdx = (presets.findIndex(url => stem(url) === stem(avatarUrl)) + 1) % presets.length
                          setAvatarUrl(presets[nextIdx])
                        }}
                        className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-xs h-9 px-4"
                      >
                        Alterar
                      </Button>
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('/assets/images/emerald-ape.webp')}
                        className="text-xs text-[#CFB28C] hover:text-white transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtitle: Password Section */}
                <div className="pt-6 border-t border-[#3F2319]">
                  <h3 className="text-sm font-bold text-white mb-4">Alterar senha</h3>

                  <div className="space-y-4 max-w-lg">
                    <div>
                      <label className="text-xs text-[#CFB28C] block mb-1">
                        Senha atual
                      </label>
                      <div className="relative">
                        <Input aria-label="Senha atual" aria-describedby={errorMsg ? 'profile-error' : undefined}
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-[#140D0A] border-[#3F2319] text-white pr-10 h-10"
                        />
                        <button
                          type="button"
                          aria-label="Mostrar senha atual" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-2.5 text-[#CFB28C] hover:text-white"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[#CFB28C] block mb-1">
                        Nova senha
                      </label>
                      <div className="relative">
                        <Input aria-label="Nova senha" aria-describedby={errorMsg ? 'profile-error' : undefined}
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="bg-[#140D0A] border-[#3F2319] text-white pr-10 h-10"
                        />
                        <button
                          type="button"
                          aria-label="Mostrar nova senha" onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-2.5 text-[#CFB28C] hover:text-white"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-[#CFB28C] block mb-1">
                        Confirmar nova senha
                      </label>
                      <div className="relative">
                        <Input aria-label="Confirmar nova senha" aria-describedby={errorMsg ? 'profile-error' : undefined}
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          className="bg-[#140D0A] border-[#3F2319] text-white pr-10 h-10"
                        />
                        <button
                          type="button"
                          aria-label="Mostrar confirmação da senha" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-2.5 text-[#CFB28C] hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold px-8 h-10"
                  >
                    Salvar
                  </Button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
