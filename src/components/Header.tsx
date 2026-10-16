import { keys } from '@/lib/query-keys'
import React, { useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Search, ShoppingCart as ShoppingBag, LogIn, Menu, X, User as UserIcon, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/axios'
import { UnavailableAction } from '@/components/ActionNotice'
import type { CartState } from '@/types/api'

interface HeaderProps {
  onOpenCart?: () => void
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, isAuthenticated, isLoading: isSessionLoading, sessionError, openAuthModal, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const routerState = useRouterState()
  const navigate = useNavigate()

  const currentPath = routerState.location.pathname
  const isMercado =
    currentPath === '/cart' ||
    currentPath === '/checkout' ||
    currentPath.startsWith('/nfts') ||
    (currentPath === '/' && routerState.location.hash === 'catalogo')
  const isInicio = currentPath === '/' && !isMercado

  // Fetch real cart state from API
  const { data: cart } = useQuery<CartState>({
    queryKey: keys.cart(user?.id),
    enabled: !isSessionLoading && !sessionError,
    queryFn: async ({ signal }) => {
      const res = await api.get('/cart', { signal })
      return res.data
    },
  })

  const cartCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0

  return (
    <header className="site-header top-0 z-40 w-full border-b border-[#3F2319] bg-[#140D0A]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1264px] items-center justify-between px-4 py-4 md:px-8">
        {/* Brand Logo */}
        <Link to="/" search={{}} hash="" onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })} className="flex items-center gap-2 group">
          <span className="font-mono text-sm font-bold tracking-[0.08em] text-[#F5F1EB] transition-colors group-hover:text-[#E89B55]">
            KURIO
          </span>
        </Link>

        {/* Desktop Nav matching Figma Information Architecture */}
        <nav className="hidden items-center gap-8 md:flex font-mono">
          <Link
            to="/"
            search={{}}
            hash=""
            onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
            className={`group relative flex flex-col py-1 text-sm font-bold tracking-wider transition-colors ${
              isInicio ? 'text-[#E89B55]' : 'text-[#F5F1EB] hover:text-[#E89B55]'
            }`}
          >
            Início
            {isInicio && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#D28A4C]" />
            )}
          </Link>
          <Link
            to="/"
            search={{}}
            hash="catalogo"
            onClick={() => document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })}
            className={`group relative flex flex-col py-1 text-sm font-bold tracking-wider transition-colors ${
              isMercado ? 'text-[#E89B55]' : 'text-[#F5F1EB] hover:text-[#E89B55]'
            }`}
          >
            Mercado
            {isMercado && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[#D28A4C]" />
            )}
          </Link>
          <UnavailableAction
            name="Criadores"
            className="header-auxiliary text-sm font-medium tracking-wider text-[#F5F1EB] transition-colors hover:text-[#E89B55]"
          >
            Criadores
          </UnavailableAction>
          <UnavailableAction
            name="Aprenda"
            className="header-auxiliary text-sm font-medium tracking-wider text-[#F5F1EB] transition-colors hover:text-[#E89B55]"
          >
            Aprenda
          </UnavailableAction>
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Search Trigger */}
          <a
            href="/#catalogo"
            aria-label="Buscar no catálogo"
            onClick={async event => {
              event.preventDefault()
              if (currentPath !== '/') await navigate({ to: '/', hash: 'catalogo' })
              document.querySelector<HTMLInputElement>('.catalog-search input')?.focus()
            }}
            className="rounded-md p-2 text-[#F5F1EB] transition-colors hover:bg-[#241612] hover:text-[#E89B55]"
          >
            <Search className="h-5 w-5" />
          </a>

          {/* Cart with Count Badge navigating to /cart per Figma 11:1278 */}
          <Link
            to="/cart"
            aria-label={`Carrinho com ${cartCount} itens`}
            className="relative rounded-md p-2 text-[#F5F1EB] transition-colors hover:bg-[#241612] hover:text-[#E89B55] cursor-pointer"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D28A4C] font-mono text-[10px] font-bold text-[#140D0A] shadow-md animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User Profile Dropdown or Login Button */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-md bg-[#241612] border border-[#3F2319] px-3 py-1.5 font-mono text-xs font-bold text-[#F5F1EB] transition-colors hover:border-[#D28A4C] cursor-pointer"
              >
                <UserIcon className="h-4 w-4 text-[#D28A4C]" />
                <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
              </button>

              {userDropdownOpen && (
                <div
                  onMouseLeave={() => setUserDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-48 rounded-lg border border-[#3F2319] bg-[#241612] py-2 shadow-2xl font-mono text-xs z-50"
                >
                  <div className="px-3 py-2 border-b border-[#3F2319]">
                    <p className="font-bold text-[#F5F1EB] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#CFB28C] truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[#F5F1EB] hover:bg-[#140D0A] hover:text-[#D28A4C] cursor-pointer"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-[#D28A4C]" />
                    <span>Meu Perfil</span>
                  </Link>
                  <Link
                    to="/wallets"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[#F5F1EB] hover:bg-[#140D0A] hover:text-[#D28A4C] cursor-pointer"
                  >
                    <span className="h-3.5 w-3.5 flex items-center justify-center font-bold text-[#D28A4C]">Ξ</span>
                    <span>Minhas Carteiras</span>
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[#F5F1EB] hover:bg-[#140D0A] hover:text-[#D28A4C] cursor-pointer"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-[#D28A4C]" />
                    <span>Carrinho ({cartCount})</span>
                  </Link>
                  <div className="border-t border-[#3F2319] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[#F0805F] hover:bg-[#140D0A] cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-2 rounded-md bg-[#D28A4C] px-4 py-2 font-mono text-xs font-bold text-[#140D0A] transition-all hover:bg-[#E89B55] hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>Entrar</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-2 text-[#F5F1EB] md:hidden hover:bg-[#241612]"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[#3F2319] bg-[#140D0A] px-6 py-4 md:hidden font-mono">
          <nav className="flex flex-col gap-3 text-sm">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="font-bold text-[#E89B55] py-1"
            >
              Início
            </Link>
            <Link
              to="/"
              search={{}}
              hash="catalogo"
              onClick={() => { setMobileMenuOpen(false); document.getElementById('catalogo')?.scrollIntoView({ block: 'start' }) }}
              className="text-[#F5F1EB] py-1"
            >
              Mercado
            </Link>
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#F5F1EB] py-1 flex items-center justify-between"
            >
              <span>Carrinho de NFTs</span>
              {cartCount > 0 && (
                <span className="bg-[#D28A4C] text-[#140D0A] font-bold px-2 py-0.5 rounded-full text-xs">
                  {cartCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <>
                <div className="border-t border-[#3F2319] my-1" />
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[#F5F1EB] py-1 flex items-center gap-2"
                >
                  <UserIcon className="w-4 h-4 text-[#D28A4C]" />
                  <span>Meu Perfil</span>
                </Link>
                <Link
                  to="/wallets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[#F5F1EB] py-1 flex items-center gap-2"
                >
                  <span className="w-4 h-4 text-[#D28A4C] font-bold">Ξ</span>
                  <span>Minhas Carteiras</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="text-[#F0805F] py-1 text-left flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta</span>
                </button>
              </>
            ) : (
              <>
                <div className="border-t border-[#3F2319] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    openAuthModal('login')
                  }}
                  className="bg-[#D28A4C] text-[#140D0A] font-bold py-2 px-4 rounded text-center w-full"
                >
                  Entrar / Cadastrar
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
