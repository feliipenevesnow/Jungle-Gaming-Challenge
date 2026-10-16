import type { Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'
import type { NFT, NFTListResponse, NFTUpdatedEvent, Order, OrderUpdatedEvent } from '@/types/api'
import { waitForNetwork } from './network-ready'

interface ServerEvents { 'nft.updated': (event: NFTUpdatedEvent) => void; 'order.updated': (event: OrderUpdatedEvent) => void }
interface ClientEvents { 'session.authenticate': (payload: { token?: string }) => void }
let socket: Socket<ServerEvents, ClientEvents> | null = null
let initializing: Promise<Socket<ServerEvents, ClientEvents>> | null = null
let currentToken: string | null = null
let currentUserId: string | null = null
let client: QueryClient | undefined
const nftListeners = new Set<(event: NFTUpdatedEvent) => void>()
const orderListeners = new Map<string, Set<(event: OrderUpdatedEvent) => void>>()
const versions = new Map<string, number>()

export function resetSocketVersions() { versions.clear() }
export function configureSocket(token: string | null, userId: string | null, queryClient: QueryClient) {
  if (currentToken !== token) {
    socket?.removeAllListeners(); socket?.disconnect(); socket = null; versions.clear(); orderListeners.clear()
  }
  currentToken = token; currentUserId = userId; client = queryClient
  void getSocket()
}
export function getSocket(): Promise<Socket<ServerEvents, ClientEvents>> {
  if (socket) return Promise.resolve(socket)
  if (initializing) return initializing
  // engine.io captures the WebSocket constructor during import. Load it only after
  // enableMocking() has installed MSW's network interceptor.
  initializing = waitForNetwork().then(() => import('socket.io-client')).then(({ io }) => {
  const instance = io(import.meta.env.VITE_ENABLE_MSW === 'true' ? window.location.origin : import.meta.env.VITE_SOCKET_URL || window.location.origin, { path: '/socket.io/', transports: ['websocket'], reconnection: true, reconnectionDelay: 250, reconnectionDelayMax: 1000, auth: callback => callback({ token: currentToken }) })
  socket = instance
  instance.on('connect', () => {
    instance.emit('session.authenticate', { token: currentToken || undefined })
    // Every connection (including reconnect) reconciles active resources via REST.
    void client?.invalidateQueries({ predicate: query => !['session'].includes(String(query.queryKey[0])) })
  })
  instance.on('nft.updated', event => {
    if (instance !== socket) return
    const key = `nft/${event.resourceId}`
    const detail = client?.getQueryData<NFT>(['nft', event.resourceId])
    const listVersions = client?.getQueriesData<NFTListResponse>({ queryKey: ['nfts'] }).flatMap(([, data]) => data?.items?.filter(item => item.id === event.resourceId).map(item => item.version) || []) || []
    const previous = Math.max(versions.get(key) || 0, detail?.version || 0, ...listVersions)
    if (event.version <= previous) return
    versions.set(key, event.version)
    if (detail) client?.setQueryData(['nft', event.resourceId], { ...detail, priceEth: event.priceEth, availableQuantity: event.availableQuantity, editionStock: event.editionStock || detail.editionStock, version: event.version })
    nftListeners.forEach(listener => listener(event))
    for (const prefix of ['nfts', 'nft', 'cart', 'cart-quote', 'checkout-quote', 'suggested-nfts', 'related-nfts', 'favorites']) void client?.invalidateQueries({ queryKey: [prefix] })
  })
  instance.on('order.updated', event => {
    if (instance !== socket || event.userId !== currentUserId) return
    const key = `order/${event.resourceId}`
    const previous = client?.getQueryData<Order>(['order', currentUserId, event.resourceId])
    if (event.version <= Math.max(versions.get(key) || 0, previous?.version || 0) || (previous && previous.status !== 'PENDING')) return
    versions.set(key, event.version)
    orderListeners.get(event.resourceId)?.forEach(listener => listener(event))
    for (const prefix of ['order', 'orders', 'cart']) void client?.invalidateQueries({ queryKey: [prefix] })
  })
  return instance
  }).finally(() => { initializing = null })
  return initializing
}
export function subscribeToNftUpdates(callback: (event: NFTUpdatedEvent) => void) {
  void getSocket(); nftListeners.add(callback)
  return () => { nftListeners.delete(callback) }
}
export function subscribeToOrderUpdates(orderId: string, callback: (event: OrderUpdatedEvent) => void) {
  void getSocket()
  const listeners = orderListeners.get(orderId) || new Set()
  listeners.add(callback); orderListeners.set(orderId, listeners)
  return () => { listeners.delete(callback); if (!listeners.size) orderListeners.delete(orderId) }
}
