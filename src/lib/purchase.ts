import type { CreateOrderPayload } from '@/types/api'

export interface PurchaseAttempt { key: string; payload: CreateOrderPayload }
const storageKey = (userId: string) => `kurio_purchase_attempt:${userId}`
export function readAttempt(userId: string): PurchaseAttempt | null {
  try { return JSON.parse(localStorage.getItem(storageKey(userId)) || 'null') as PurchaseAttempt | null } catch { return null }
}
export function saveAttempt(userId: string, attempt: PurchaseAttempt) { localStorage.setItem(storageKey(userId), JSON.stringify(attempt)) }
export function clearAttempt(userId: string) { localStorage.removeItem(storageKey(userId)) }
export function clearAllAttempts() {
  for (const key of Object.keys(localStorage)) if (key.startsWith('kurio_purchase_attempt:')) localStorage.removeItem(key)
}
