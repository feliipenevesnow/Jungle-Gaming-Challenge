/** ETH uses integer wei; formatting preserves every significant digit. */
const SCALE = 10n ** 18n

export function parseEthToBigInt(value: string): bigint {
  const match = /^([+-]?)(\d+)(?:\.(\d{0,18}))?$/.exec(value.trim())
  if (!match) throw new Error('Valor ETH inválido (máximo de 18 casas decimais).')
  const magnitude = BigInt(match[2]) * SCALE + BigInt((match[3] || '').padEnd(18, '0'))
  return match[1] === '-' ? -magnitude : magnitude
}

export function formatBigIntToEth(value: bigint, minimumDecimals = 2): string {
  const absolute = value < 0n ? -value : value
  const fraction = (absolute % SCALE).toString().padStart(18, '0').replace(/0+$/, '').padEnd(minimumDecimals, '0')
  return `${value < 0n ? '-' : ''}${absolute / SCALE}${fraction ? `.${fraction}` : ''}`
}

export function addEth(a: string, b: string, minimumDecimals = 2): string {
  return formatBigIntToEth(parseEthToBigInt(a) + parseEthToBigInt(b), minimumDecimals)
}

export function subtractEth(a: string, b: string, minimumDecimals = 2): string {
  const result = parseEthToBigInt(a) - parseEthToBigInt(b)
  return formatBigIntToEth(result < 0n ? 0n : result, minimumDecimals)
}

export function multiplyEth(a: string, quantity: number, minimumDecimals = 2): string {
  if (!Number.isSafeInteger(quantity)) throw new Error('A quantidade deve ser inteira.')
  return formatBigIntToEth(parseEthToBigInt(a) * BigInt(quantity), minimumDecimals)
}

export function applyPercentageDiscount(baseEth: string, percent: number, minimumDecimals = 2) {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new Error('Desconto inválido.')
  const base = parseEthToBigInt(baseEth)
  const discount = base * BigInt(percent) / 100n // At most one wei is rounded down.
  return { discountEth: formatBigIntToEth(discount, minimumDecimals), finalEth: formatBigIntToEth(base - discount, minimumDecimals) }
}
