export const sessionStorageKey = 'kurio_session_token'

export function getSessionToken(): string | null {
  return localStorage.getItem(sessionStorageKey)
}

export function isCurrentSession(token: string | null): boolean {
  return getSessionToken() === token
}
