import { Link } from '@tanstack/react-router'
import { Heart, Home, ShoppingCart, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth'
export function MobileNav() {
  const { isAuthenticated, openAuthModal } = useAuth()
  return <nav className="mobile-nav" aria-label="Navegação principal mobile">
    <svg className="mobile-nav-surface" viewBox="0 0 414 95" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 32Q0 0 32 0H128C145 0 152 5 160 18C170 40 185 49 207 49C229 49 244 40 254 18C262 5 269 0 286 0H382Q414 0 414 32V95H0Z" fill="#241612" />
    </svg>
    <Link to="/" aria-label="Início"><Home fill="currentColor" /></Link>
    <Link to="/favorites" aria-label="Favoritos"><Heart fill="currentColor" /></Link>
    <Link to="/" hash="catalogo" className="mobile-nav-explore" aria-label="Explorar NFTs"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 12V10Q6 5 11 5H14M18 5H21Q26 5 26 10V12M6 20V22Q6 27 11 27H14M18 27H21Q26 27 26 22V20M4 16H28" /></svg></Link>
    <Link to="/cart" aria-label="Carrinho"><ShoppingCart fill="currentColor" /></Link>
    {isAuthenticated ? <Link to="/profile" aria-label="Meu perfil"><UserRound fill="currentColor" /></Link> : <button aria-label="Entrar" onClick={() => openAuthModal('login')}><UserRound fill="currentColor" /></button>}
  </nav>
}
