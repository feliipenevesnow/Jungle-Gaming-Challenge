import React, { useState } from 'react'
import { Eye, EyeOff, AlertCircle, Info } from 'lucide-react'
import { isAxiosError } from 'axios'
import { apiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/lib/auth'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthModal() {
  const { isAuthModalOpen, authModalMode } = useAuth()
  return isAuthModalOpen ? <AuthModalForm key={authModalMode} /> : null
}
function AuthModalForm() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, register, restoreAuthFocus } = useAuth()


  const [mode, setMode] = useState<'login' | 'register'>(authModalMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [socialNotice, setSocialNotice] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSocialNotice(null)
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        await login({ email, password })
      } else {
        if (!name.trim()) {
          setErrorMessage('Por favor, informe seu nome completo.')
          setIsSubmitting(false)
          return
        }
        if (password !== confirmation) { setErrorMessage('A confirmação de senha não confere.'); return }
        await register({ name, email, password })
      }
    } catch (err: unknown) {
      const status = isAxiosError(err) ? err.response?.status : undefined
      if (status === 401) {
        setErrorMessage('Credenciais inválidas. Verifique seu e-mail e senha.')
      } else if (status === 409) {
        setErrorMessage('Este e-mail já está cadastrado na plataforma.')
      } else {
        setErrorMessage(apiErrorMessage(err, 'Erro ao processar autenticação. Tente novamente.'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnavailableAction = (actionName: string) => {
    setErrorMessage(null)
    setSocialNotice(`${actionName} não disponível no ambiente demonstrativo.`)
  }

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent data-mode={mode} onCloseAutoFocus={event => { event.preventDefault(); restoreAuthFocus() }} className="auth-dialog w-full max-w-[500px] p-0 overflow-hidden bg-[#241612] border border-[#3F2319] shadow-2xl rounded-xl">
        <div className="auth-mobile-brand">KURIO</div>
        <div className="auth-mobile-title">{mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}</div>
        {/* Modal Header */}
        <div className="auth-heading pt-10 pb-6 px-10 text-center">
          {/* Tabs Switcher: Entrar | Criar conta */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setErrorMessage(null)
                setSocialNotice(null)
              }}
              className={`text-xl font-mono transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'text-[#E89B55] font-bold border-b-2 border-[#D28A4C] pb-0.5'
                  : 'text-[#F5F1EB] hover:text-[#CFB28C]'
              }`}
            >
              Entrar
            </button>
            <span className="text-[#F0805F] font-mono text-lg font-bold">|</span>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setErrorMessage(null)
                setSocialNotice(null)
              }}
              className={`text-xl font-mono transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'text-[#E89B55] font-bold border-b-2 border-[#D28A4C] pb-0.5'
                  : 'text-[#F5F1EB] hover:text-[#CFB28C]'
              }`}
            >
              Criar conta
            </button>
          </div>

          <DialogTitle className="sr-only">
            {mode === 'login' ? 'Entrar no Kurio' : 'Criar conta no Kurio'}
          </DialogTitle>

          <DialogDescription className="mt-3 text-xs font-mono text-[#CFB28C] leading-relaxed max-w-sm mx-auto">
            {mode === 'login'
              ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
              : 'Crie sua conta para colecionar e gerenciar arte digital verificada.'}
          </DialogDescription>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-form px-10 pb-6 space-y-4">
          {errorMessage && (
            <div id="auth-error" role="alert" className="flex items-start gap-2 p-3 rounded-md bg-[#F0805F]/15 border border-[#F0805F]/40 text-[#F0805F] text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {socialNotice && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-[#D28A4C]/15 border border-[#D28A4C]/40 text-[#E89B55] text-xs font-mono">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{socialNotice}</span>
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-1.5">
              <Label htmlFor="auth-name">Nome completo</Label>
              <Input
                id="auth-name" aria-describedby={errorMessage ? 'auth-error' : undefined}
                type="text"
                required
                placeholder="Nome de usuário"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="auth-email">E-mail</Label>
            <Input
              aria-describedby={errorMessage ? 'auth-error' : undefined} id="auth-email"
              type="email"
              required
              placeholder={mode === 'login' ? 'contato@email.com' : 'Digite seu e-mail'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Senha</Label>
            <div className="relative">
              <Input
                aria-describedby={errorMessage ? 'auth-error' : undefined} minLength={mode === 'register' ? 6 : undefined} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={mode === 'login' ? '***********' : 'Senha'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CFB28C] hover:text-[#D28A4C] p-1"
                
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="sr-only">Alternar visualização de senha</span>
              </button>
            </div>
          </div>

          {mode === 'register' && <div className="relative"><Label className="sr-only" htmlFor="auth-confirm">Confirmar senha</Label><Input id="auth-confirm" aria-describedby={errorMessage ? 'auth-error' : undefined} type={showPassword ? 'text' : 'password'} required placeholder="Confirmar senha" value={confirmation} onChange={e => setConfirmation(e.target.value)} /><button type="button" className="auth-confirm-eye" aria-label="Mostrar confirmação de senha" onClick={() => setShowPassword(!showPassword)}><EyeOff size={16} /></button></div>}
          {mode === 'login' && (
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => handleUnavailableAction('Recuperação de senha')}
                className="text-xs font-mono text-[#E89B55] hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-sm tracking-wider uppercase mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#140D0A] border-t-transparent rounded-full animate-spin" />
                Processando...
              </span>
            ) : mode === 'login' ? (
              'Entrar'
            ) : (
              <><span className="auth-desktop-submit">Criar conta</span><span className="auth-mobile-submit">Criar perfil</span></>
            )}
          </Button>

          {/* Social Sign In Divider */}
          <div className="pt-2">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#3F2319] w-full" />
              <span className="bg-[#241612] px-3 text-[11px] font-mono text-[#CFB28C] uppercase tracking-wider shrink-0">
                Ou continue com
              </span>
              <div className="border-t border-[#3F2319] w-full" />
            </div>

            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => handleUnavailableAction('Login com Google')}
                className="w-full h-10 flex items-center justify-center gap-3 rounded-[5px] border border-[#3F2319] bg-[#140D0A]/50 hover:bg-[#2F1D15] text-[#CFB28C] hover:text-[#F5F1EB] font-mono text-xs transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 8.9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.4C.7 8.8 0 10.3 0 12s.7 3.2 1.9 5.6l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.5-2.4-6.4-5.3L1.9 16C3.7 19.8 7.5 23 12 23z"
                  />
                </svg>
                Continuar com Google
              </button>

              <button
                type="button"
                onClick={() => handleUnavailableAction('Login com Facebook')}
                className="w-full h-10 flex items-center justify-center gap-3 rounded-[5px] border border-[#3F2319] bg-[#140D0A]/50 hover:bg-[#2F1D15] text-[#CFB28C] hover:text-[#F5F1EB] font-mono text-xs transition-colors"
              >
                <svg className="w-4 h-4 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continuar com Facebook
              </button>
            </div>
          </div>

          <button type="button" className="auth-switch-mobile" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrorMessage(null) }}>{mode === 'login' ? 'Novo na Kurio? Crie uma conta' : 'Já tem uma conta? Entre'}</button>
        </form>

        {/* Bottom 10px accent bar matching Figma 9:1228 */}
        <div className="h-[10px] w-full bg-[#D28A4C]" />
      </DialogContent>
    </Dialog>
  )
}
