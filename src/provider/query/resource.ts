import type { QueryClient } from '@tanstack/react-query'
import { queryClient, queryKeys, getQuerySessionVersion } from './client'

/** Imperative API clients share the same session-scoped cache as React Query consumers. */
export function createResourceQueries(
  module: string,
  resource: string,
  client: QueryClient = queryClient,
  getVersion: () => number = getQuerySessionVersion,
) {
  const key = (version = getVersion()) => queryKeys.resource(version, module, resource)
  const fetch = <T>(
    queryKey: readonly unknown[],
    load: (signal: AbortSignal) => Promise<T>,
    consumerSignal?: AbortSignal,
  ) => {
    if (consumerSignal?.aborted) return Promise.reject(new DOMException('Query cancelled', 'AbortError'))
    const request = client.fetchQuery({
      queryKey,
      staleTime: 0,
      queryFn: ({ signal }) => load(signal),
    })
    if (!consumerSignal) return request
    // One disappearing consumer must not abort a deduplicated request used by another page.
    return new Promise<T>((resolve, reject) => {
      const abort = () => reject(new DOMException('Query cancelled', 'AbortError'))
      consumerSignal.addEventListener('abort', abort, { once: true })
      request.then(
        value => {
          consumerSignal.removeEventListener('abort', abort)
          resolve(value)
        },
        error => {
          consumerSignal.removeEventListener('abort', abort)
          reject(error)
        },
      )
    })
  }
  return {
    key,
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
