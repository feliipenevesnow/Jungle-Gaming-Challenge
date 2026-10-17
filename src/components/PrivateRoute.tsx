import { Fragment, useEffect, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { Button } from './ui/button'

/** Keep the current Router location while authenticating so the flow can resume. */
export function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, sessionError, retrySession, openAuthModal } = useAuth()
  useEffect(() => { if (!isLoading && !user && !sessionError) openAuthModal('login') }, [isLoading, user, sessionError, openAuthModal])
  if (isLoading) return <div className="page-width py-16" role="status"><div className="skeleton-shimmer h-32 rounded-xl" /><span className="sr-only">Recuperando sessão...</span></div>
  if (!user && sessionError) return <div className="page-width py-16 text-center" role="alert"><h1 className="text-xl mb-4">Não foi possível recuperar sua sessão</h1><p className="mb-4">Confira sua conexão e tente novamente.</p><Button onClick={retrySession}>Tentar novamente</Button></div>
  if (!user) return <div className="page-width py-16 text-center"><h1 className="text-xl mb-4 font-bold text-[#F5F1EB]">Autenticação necessária</h1><p className="mb-4 text-[#CFB28C]">Entre na sua conta para continuar de onde parou.</p><div className="flex items-center justify-center gap-3"><Button onClick={() => openAuthModal('login')}>Entrar / Criar conta</Button><Link to="/" className="inline-flex items-center justify-center rounded border border-[#3F2319] bg-[#241612] px-4 py-2 text-sm text-[#CFB28C] hover:border-[#D28A4C] hover:text-[#E89B55]">Voltar ao início</Link></div></div>
  return <Fragment key={user.id}>{children}</Fragment>
}
