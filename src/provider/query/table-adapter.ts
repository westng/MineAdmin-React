import { QueryObserver, type QueryClient } from '@tanstack/react-query'
import type { TableRequestSnapshot, TableRequestStore } from '@/components/ma-pro-table'
import { fetchResourceQuery } from '../../services/query/resource'

/** All request-mode tables in an application share its Query cache and session ownership. */
export function createTableRequestStore(client: QueryClient, getVersion: () => number, id: string): TableRequestStore {
  const observer = new QueryObserver<unknown>(client, {
    queryKey: ['session', getVersion(), 'table', id],
    enabled: false,
  })
  let snapshot: TableRequestSnapshot = { loading: false, active: false }
  return {
    getSnapshot: () => snapshot,
    subscribe: listener =>
      observer.subscribe(result => {
        snapshot = { active: true, response: result.data, loading: result.isFetching, error: result.error }
        listener()
      }),
    request(key, params, load, signal, resourceQuery) {
      const options = resourceQuery ?? {
        queryKey: ['session', getVersion(), 'table', id, key, params],
        queryFn: ({ signal: requestSignal }: { signal: AbortSignal }) => load(requestSignal),
      }
      observer.setOptions({ ...options, enabled: true })
      return fetchResourceQuery(client, options, signal)
    },
  }
}
