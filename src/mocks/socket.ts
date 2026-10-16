import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { db } from './db'
import type { NFTUpdatedEvent, OrderUpdatedEvent } from '@/types/api'

type Client = { socket: ReturnType<typeof toSocketIo>['client']; close: () => void; userId?: string; token?: string; ready?: boolean }
const clients = new Set<Client>()
let pausedUntil = 0
export const socketIoLink = ws.link('*')
export const socketHandler = socketIoLink.addEventListener('connection', connection => {
  if (!connection.client.url.pathname.startsWith('/socket.io')) { connection.server.connect(); return }
  if (Date.now() < pausedUntil) { connection.client.close(); return }
  const bound = toSocketIo(connection)
  const entry: Client = { socket: bound.client, close: () => connection.client.close() }
  clients.add(entry)
  // Engine.IO/Socket.IO handshake and packet encoding belong to the binding.
  // Authenticate the namespace immediately through the standard client event.
  bound.client.on('session.authenticate', (_event, payload: { token?: string }) => {
    entry.token = payload.token
    entry.userId = payload.token ? db.getSession(payload.token)?.userId : undefined
    entry.ready = true
  })
  const heartbeat = setInterval(() => connection.client.send('2'), 10000)
  connection.client.addEventListener('close', () => { clearInterval(heartbeat); clients.delete(entry) })
})
export function hasSocketClient(userId: string) {
  return [...clients].some(client => client.ready && (userId === 'guest' ? !client.userId : client.token && db.getSession(client.token)?.userId === userId))
}
export function disconnectClients(duration = 500) {
  pausedUntil = Date.now() + duration
  clients.forEach(client => client.close())
  clients.clear()
}
export function broadcastNftUpdated(event: NFTUpdatedEvent) {
  clients.forEach(client => client.socket.emit('nft.updated', event))
}
export function broadcastOrderUpdated(event: OrderUpdatedEvent) {
  clients.forEach(client => { if (client.token && db.getSession(client.token)?.userId === event.userId) client.socket.emit('order.updated', event) })
}
