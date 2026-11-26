/** Keep registry keys such as zh_CN, while requiring a valid Intl language tag. */
export function normalizeLocale(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const locale = value.trim()
  try {
    Intl.getCanonicalLocales(locale.replaceAll('_', '-'))
    return locale
  } catch {
    return null
  }
}

/** Read plain language keys, JSON strings and the previous { c, e, v } cache format. */
export function parseStoredLocale(raw: string | null, fallback = 'zh_CN'): string {
  let value: unknown = raw
  for (let depth = 0; depth < 4; depth++) {
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value)
        continue
      } catch {
        return normalizeLocale(value) ?? fallback
      }
    }
    if (
      value &&
      typeof value === 'object' &&
      'c' in value &&
      typeof value.c === 'number' &&
      'e' in value &&
      typeof value.e === 'number' &&
      Number.isFinite(value.e) &&
      value.e > Date.now() &&
      'v' in value &&
      typeof value.v === 'string'
    ) {
      value = value.v
      continue
    }
    return fallback
  }
  return fallback
}
