import type { NetworkType } from '@/types/api'

export interface CheckoutDraft {
  displayName: string
  username: string
  profileName: string
  ensOrSecondary: string
  walletType: string
  referralCode: string
  ensName: string
  collectorNote: string
  networkOverride: NetworkType | null
  selectedWalletProvider: string
  selectedWalletId: string | null
  useOtherWallet: boolean
}

const prefix = 'kurio_checkout_draft:'
const stringFields = ['displayName', 'username', 'profileName', 'ensOrSecondary', 'walletType', 'referralCode', 'ensName', 'collectorNote', 'selectedWalletProvider'] as const

export function readCheckoutDraft(userId: string): CheckoutDraft | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(`${prefix}${userId}`) || 'null')
    if (!value || typeof value !== 'object') return null
    const data = value as Record<string, unknown>
    if (!stringFields.every(field => typeof data[field] === 'string') || typeof data.useOtherWallet !== 'boolean') return null
    if (data.selectedWalletId !== null && typeof data.selectedWalletId !== 'string') return null
    if (data.networkOverride !== null && !['Ethereum', 'Polygon', 'Solana'].includes(String(data.networkOverride))) return null
    return data as unknown as CheckoutDraft
  } catch { return null }
}

export function saveCheckoutDraft(userId: string, draft: CheckoutDraft) {
  try { sessionStorage.setItem(`${prefix}${userId}`, JSON.stringify(draft)) } catch { /* Storage may be unavailable. The form remains usable. */ }
}

export function clearCheckoutDraft(userId: string) {
  try { sessionStorage.removeItem(`${prefix}${userId}`) } catch { /* No stored draft to clear. */ }
}

export function clearAllCheckoutDrafts() {
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key)
  } catch { /* Storage may be unavailable. */ }
}
