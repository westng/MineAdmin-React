import { QueryObserver, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from './client'

type ResourceQuery<T> = {
  queryKey: readonly unknown[]
  queryFn: (context: { signal: AbortSignal }) => Promise<T>
}
/** Imperative consumers participate in Query's observer lifetime, including React unmounts. */
export function fetchResourceQuery<T>(
  client: QueryClient,
  options: ResourceQuery<T>,
  signal?: AbortSignal,
): Promise<T> {
  const cancelled = () => new DOMException('Query cancelled', 'AbortError')
  if (signal?.aborted) return Promise.reject(cancelled())
  // Disabled observers retain shared transport without starting an automatic second request.
  const observer = new QueryObserver(client, { ...options, enabled: false })
  const unsubscribe = observer.subscribe(() => {})
  const query = observer.getCurrentQuery()
  const promise = client.fetchQuery({ ...options, staleTime: 0 })
  return new Promise<T>((resolve, reject) => {
    let released = false
    const release = (aborted = false) => {
      if (released) return
      released = true
      signal?.removeEventListener('abort', abort)
      unsubscribe()
      if (aborted && query.getObserversCount() === 0 && client.getQueryCache().get(query.queryHash) === query) {
        void client.cancelQueries({ queryKey: options.queryKey, exact: true })
      }
    }
    const abort = () => {
      release(true)
      reject(cancelled())
    }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    promise.then(
      value => {
        release()
        resolve(value)
      },
      error => {
        release()
        reject(error)
      },
    )
  })
}

/** Imperative API clients share the same session-scoped cache as React Query consumers. */
export function createResourceQueries(module: string, resource: string, client: QueryClient, getVersion: () => number) {
  const key = (version = getVersion()) => queryKeys.resource(version, module, resource)
  const fetch = <T>(
    queryKey: readonly unknown[],
    load: (signal: AbortSignal) => Promise<T>,
    consumerSignal?: AbortSignal,
  ) => {
    return fetchResourceQuery(client, { queryKey, queryFn: ({ signal }) => load(signal) }, consumerSignal)
  }
  return {
    key,
    list<P extends object, T>(load: (parameters: P, signal: AbortSignal) => Promise<T>) {
      const queryOptions = (parameters: P = {} as P) => ({
        queryKey: [...key(), 'list', parameters],
        queryFn: ({ signal }: { signal: AbortSignal }) => load(parameters, signal),
      })
      return Object.assign(
        (parameters: P = {} as P, signal?: AbortSignal) =>
          fetch([...key(), 'list', parameters], requestSignal => load(parameters, requestSignal), signal),
        { queryOptions },
      )
    },
    options<T>(parameters: object, load: (signal: AbortSignal) => Promise<T>) {
      return {
        queryKey: [...key(), 'list', parameters],
        queryFn: ({ signal }: { signal: AbortSignal }) => load(signal),
      }
    },
    fetch<T>(parameters: object, load: (signal: AbortSignal) => Promise<T>, consumerSignal?: AbortSignal) {
      return fetch([...key(), 'list', parameters], load, consumerSignal)
    },
    detail<T>(id: string | number, load: (signal: AbortSignal) => Promise<T>) {
      return fetch([...key(), 'detail', id], load)
    },
    async mutate<T>(write: () => Promise<T>, related: readonly (readonly [string, string])[] = []) {
      const version = getVersion()
      const response = await write()
      if (version !== getVersion()) throw new DOMException('Session changed', 'AbortError')
      const envelope = response as { data?: { code?: number } }
      if (envelope?.data?.code !== undefined && envelope.data.code !== 200) return response
      for (const queryKey of [key(version), ...related.map(([m, r]) => queryKeys.resource(version, m, r))]) {
        await client.cancelQueries({ queryKey })
        await client.invalidateQueries({ queryKey })
      }
      return response
    },
  }
}
