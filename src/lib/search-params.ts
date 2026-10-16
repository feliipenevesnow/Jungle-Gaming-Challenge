/** Scalar URL fields stay strings, preserving exact ETH values and numeric NFT searches. */
export function parseSearch(search: string) { return Object.fromEntries(new URLSearchParams(search)) }
export function stringifySearch(search: Record<string, unknown>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) if (value !== undefined && value !== null) params.set(key, String(value))
  const value = params.toString()
  return value ? `?${value}` : ''
}
