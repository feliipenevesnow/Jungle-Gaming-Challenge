import type { EditionType, NetworkType, QuoteRequest, User } from '@/types/api'
import { parseEthToBigInt } from '@/lib/decimal'

export class ApiFailure extends Error {
  status: number
  fieldErrors?: Record<string, string>
  constructor(message: string, status = 400, fieldErrors?: Record<string, string>) { super(message); this.status = status; this.fieldErrors = fieldErrors }
}
export const editions: EditionType[] = ['1/1', '1/10', '1/50', 'ABERTA']
export const networks: NetworkType[] = ['Ethereum', 'Polygon', 'Solana']
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiFailure('Dados inválidos.')
  return value as Record<string, unknown>
}
export function text(value: unknown, label: string, required = true): string {
  if (value === undefined && !required) return ''
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > 2000) throw new ApiFailure(`${label}: valor inválido.`)
  return value.trim()
}
export function network(value: unknown): NetworkType {
  if (!networks.includes(value as NetworkType)) throw new ApiFailure('Selecione uma rede válida.')
  return value as NetworkType
}
export function quantity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw new ApiFailure('A quantidade deve ser um inteiro maior que zero.')
  return value
}
export function items(value: unknown): QuoteRequest['items'] {
  if (!Array.isArray(value) || !value.length) throw new ApiFailure('O carrinho está vazio.')
  const parsed = value.map(entry => {
    const item = object(entry)
    if (!editions.includes(item.edition as EditionType)) throw new ApiFailure('Edição inválida.')
    return { nftId: text(item.nftId, 'NFT'), edition: item.edition as EditionType, quantity: quantity(item.quantity) }
  })
  if (new Set(parsed.map(item => `${item.nftId}/${item.edition}`)).size !== parsed.length) throw new ApiFailure('Existem itens duplicados no pedido.')
  return parsed
}
export function email(value: unknown): string {
  const result = text(value, 'E-mail').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new ApiFailure('Informe um e-mail válido.', 400, { email: 'E-mail inválido.' })
  return result
}
export function username(value: unknown): string {
  const result = text(value, 'Nome de usuário').replace(/^@/, '')
  if (!/^[\p{L}\p{N}_.-]{2,40}$/u.test(result)) throw new ApiFailure('Nome de usuário: use de 2 a 40 letras, números, ponto, hífen ou sublinhado.')
  return `@${result}`
}
export function password(value: unknown): string {
  if (typeof value !== 'string' || value.length < 6 || value.length > 128) throw new ApiFailure('A senha deve ter entre 6 e 128 caracteres.', 400, { password: 'Use ao menos 6 caracteres.' })
  return value
}
export function walletAddress(value: unknown, chain: NetworkType): string {
  const address = text(value, 'Endereço da carteira')
  if (chain === 'Solana' ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) : !/^0x[\da-fA-F]{40}$/.test(address) && !/^[a-z0-9.-]+\.eth$/.test(address)) throw new ApiFailure('Endereço da carteira inválido para a rede escolhida.')
  return address
}
export function eth(value: unknown): string {
  const result = text(value, 'Preço')
  try { if (parseEthToBigInt(result) < 0n) throw new Error() } catch { throw new ApiFailure('Preço ETH inválido.') }
  return result
}
export function profile(value: unknown): Partial<User> {
  const data = object(value)
  const result: Partial<User> = {}
  if ('name' in data) result.name = text(data.name, 'Nome de exibição')
  if ('username' in data) result.username = username(data.username)
  for (const key of ['bio', 'ensName', 'walletNickname'] as const) if (key in data) result[key] = text(data[key], key, false)
  if ('avatarUrl' in data) {
    const url = text(data.avatarUrl, 'Avatar')
    if (!url.startsWith('/assets/images/')) throw new ApiFailure('Selecione um avatar disponível.')
    result.avatarUrl = url
  }
  return result
}
