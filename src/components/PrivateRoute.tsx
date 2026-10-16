import { Fragment, useEffect, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from './ui/button'

/** Keep the current Router location while authenticating so the flow can resume. */
export function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, sessionError, retrySession, openAuthModal } = useAuth()
  useEffect(() => { if (!isLoading && !user && !sessionError) openAuthModal('login') }, [isLoading, user, sessionError, openAuthModal])
  if (isLoading) return <div className="page-width py-16" role="status"><div className="skeleton-shimmer h-32 rounded-xl" /><span className="sr-only">Recuperando sessão...</span></div>
  if (!user && sessionError) return <div className="page-width py-16 text-center" role="alert"><h1 className="text-xl mb-4">Não foi possível recuperar sua sessão</h1><p className="mb-4">Confira sua conexão e tente novamente.</p><Button onClick={retrySession}>Tentar novamente</Button></div>
  if (!user) return <div className="page-width py-16 text-center"><h1 className="text-xl mb-4">Autenticação necessária</h1><p className="mb-4">Entre na sua conta para continuar de onde parou.</p><Button onClick={() => openAuthModal('login')}>Entrar / Criar conta</Button></div>
  return <Fragment key={user.id}>{children}</Fragment>
}
