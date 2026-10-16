import { keys } from '@/lib/query-keys'
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './axios'
import { configureSocket, resetSocketVersions } from './socket'
import { getSessionToken, isCurrentSession, sessionStorageKey as storageKey } from './session'
import { clearAllCheckoutDrafts } from './checkout-draft'
import type { User, LoginPayload, RegisterPayload, AuthResponse } from '@/types/api'

interface AuthContextType {
  user: User | null; token: string | null; isAuthenticated: boolean; isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>; register: (payload: RegisterPayload) => Promise<void>; logout: () => Promise<void>
  refreshUser: () => Promise<void>
  sessionError: boolean; retrySession: () => void
  isAuthModalOpen: boolean; authModalMode: 'login' | 'register'
  openAuthModal: (mode?: 'login' | 'register') => void; closeAuthModal: () => void
  restoreAuthFocus: () => void
}
const AuthContext = createContext<AuthContextType | undefined>(undefined)
const privateKeys = ['session', 'favorites', 'cart', 'order', 'orders', 'cart-quote', 'checkout-quote', 'profile', 'wallets']
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(getSessionToken)
  const [isAuthModalOpen, setModalOpen] = useState(false)
  const [authModalMode, setMode] = useState<'login' | 'register'>('login')
  const authTrigger = useRef<HTMLElement | null>(null)
  const session = useQuery({ queryKey: keys.session(token), queryFn: async ({ signal }) => (await api.get<Pick<AuthResponse, 'user' | 'expiresAt'>>('/auth/me', { signal })).data, enabled: !!token, retry: false, staleTime: 30000 })
  const user = token ? session.data?.user || null : null
  const clear = useCallback(async () => {
    await queryClient.cancelQueries({ predicate: query => privateKeys.includes(String(query.queryKey[0])) })
    queryClient.removeQueries({ predicate: query => privateKeys.includes(String(query.queryKey[0])) })
    queryClient.getMutationCache().clear()
  }, [queryClient])
  const clearSession = useCallback(() => {
    localStorage.removeItem(storageKey); setToken(null)
    configureSocket(null, null, queryClient)
    void clear()
  }, [clear, queryClient])
  const logout = useCallback(async () => {
    const originalToken = getSessionToken()
    clearAllCheckoutDrafts()
    try { await api.post('/auth/logout') } finally { if (isCurrentSession(originalToken)) clearSession() }
  }, [clearSession])
  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    authTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setMode(mode); setModalOpen(true)
  }, [])
  const closeAuthModal = useCallback(() => setModalOpen(false), [])
  const restoreAuthFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const trigger = authTrigger.current
      if (trigger && trigger !== document.body && trigger.isConnected && trigger.getClientRects().length) { trigger.focus(); return }
      const fallback = [...document.querySelectorAll<HTMLElement>('.checkout-submit button, .site-header a, .mobile-nav a')].find(element => element.getClientRects().length > 0)
      fallback?.focus()
    })
  }, [])
  useEffect(() => { configureSocket(token, user?.id || null, queryClient) }, [token, user?.id, queryClient])
  useEffect(() => {
    const reset = () => { clearAllCheckoutDrafts(); clearSession(); resetSocketVersions(); setModalOpen(false); void queryClient.invalidateQueries() }
    window.addEventListener('kurio:mocks-reset', reset)
    return () => window.removeEventListener('kurio:mocks-reset', reset)
  }, [clearSession, queryClient])
  useEffect(() => {
    const expired = () => { if (token && isCurrentSession(token)) { clearSession(); openAuthModal('login') } }
    window.addEventListener('kurio:session-expired', expired)
    const duration = session.data ? new Date(session.data.expiresAt).getTime() - Date.now() : null
    const timeout = token && duration !== null ? setTimeout(expired, Math.max(0, duration)) : undefined
    return () => { window.removeEventListener('kurio:session-expired', expired); clearTimeout(timeout) }
  }, [clearSession, openAuthModal, session.data, token])
  const authenticate = async (path: string, payload: LoginPayload | RegisterPayload) => {
    const { data } = await api.post<AuthResponse>(path, payload)
    await clear()
    localStorage.setItem(storageKey, data.token)
    queryClient.setQueryData(keys.session(data.token), { user: data.user, expiresAt: data.expiresAt })
    setToken(data.token); closeAuthModal()
  }
  const refreshUser = async () => { await queryClient.invalidateQueries({ queryKey: keys.session(token) }) }
  return <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading: !!token && (session.isPending || (!user && session.isFetching)), sessionError: !!token && session.isError, retrySession: () => { void session.refetch() }, login: payload => authenticate('/auth/login', payload), register: payload => authenticate('/auth/register', payload), logout, refreshUser, isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal, restoreAuthFocus }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requires AuthProvider')
  return context
}
