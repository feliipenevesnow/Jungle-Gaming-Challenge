import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { HomePage } from '@/components/HomePage'

export const Route = createFileRoute('/cadastro')({
  component: CadastroPage,
})

function CadastroPage() {
  const { openAuthModal, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/' })
      return
    }
    openAuthModal('register')
  }, [isAuthenticated, navigate, openAuthModal])

  return <HomePage />
}
