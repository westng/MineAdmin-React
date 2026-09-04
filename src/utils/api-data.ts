export function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== 'object') return []
  const record = payload as Record<string, unknown>
  if (Array.isArray(record.list)) return record.list as T[]
  if (Array.isArray(record.items)) return record.items as T[]
  if (Array.isArray(record.data)) return record.data as T[]
  return []
}

export function extractTotal(payload: unknown, fallback: number) {
  if (!payload || typeof payload !== 'object') return fallback
  const record = payload as Record<string, unknown>
  return typeof record.total === 'number' ? record.total : fallback
}
