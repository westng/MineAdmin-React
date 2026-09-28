import { useMemo } from 'react'
import { useResourceQuery } from './use-resource-query'
import { extractList, extractTotal } from '@/utils/api-data'
export type TableQueryOptions = (params: Record<string, unknown>) => {
  queryKey: readonly unknown[]
  queryFn: (context: { signal: AbortSignal }) => Promise<unknown>
}
export function useQueryTable<T>(options: TableQueryOptions) {
  const query = useResourceQuery(options)
  const page = useMemo(() => {
    const envelope = query.data as { data?: { data?: unknown } } | undefined
    const payload = envelope?.data?.data
    const rows = extractList<T>(payload)
    return { data: rows, total: extractTotal(payload, rows.length) }
  }, [query.data])
  return {
    ...page,
    request: query.request,
    sessionVersion: query.sessionVersion,
    loading: query.isFetching,
    error: query.error?.message ?? '',
  }
}
