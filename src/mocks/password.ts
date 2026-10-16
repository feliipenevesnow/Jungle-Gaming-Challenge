const PREFIX = 'pbkdf2'

export async function hashPassword(password: string, salt: string = crypto.randomUUID()): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)
  const digest = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('')
  return `${PREFIX}$${salt}$${digest}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Compatibility with previously persisted demo accounts; login upgrades these hashes.
  if (!stored.startsWith(`${PREFIX}$`)) return stored === password
  return await hashPassword(password, stored.split('$')[1]) === stored
}
