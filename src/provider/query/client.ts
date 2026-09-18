import { QueryClient } from '@tanstack/react-query'
import type { SessionManager } from '@/services/auth/session-manager'

let sessionVersion = () => 0
export const getQuerySessionVersion = () => sessionVersion()

export const queryKeys = {
  session: (version: number) => ['session', version] as const,
  resource: (version: number, module: string, resource: string) => ['session', version, module, resource] as const,
  list: (version: number, module: string, resource: string, parameters: object) =>
    [...queryKeys.resource(version, module, resource), 'list', parameters] as const,
  detail: (version: number, module: string, resource: string, id: string | number) =>
    [...queryKeys.resource(version, module, resource), 'detail', id] as const,
}
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 300_000,
        refetchOnWindowFocus: false,
        retry: (attempt, error) => {
          if (error.name === 'AbortError' || ('code' in error && error.code === 'ERR_CANCELED')) return false
          const code = 'code' in error ? error.code : undefined
          if (['unauthorized', 'forbidden', 'validation', 'conflict', 'plugin'].includes(String(code))) return false
          const status = 'status' in error ? Number(error.status) : Number(code)
          return attempt < 1 && !(status >= 400 && status < 500 && status !== 408 && status !== 429)
        },
      },
      mutations: { retry: false },
    },
  })
}
export function bindQuerySession(client: QueryClient, session: SessionManager) {
  const getVersion = () => session.getState().sessionVersion
  if (client === queryClient) sessionVersion = getVersion
  const unsubscribe = session.subscribe((next, previous) => {
    if (next.sessionVersion === previous.sessionVersion) return
    void client.cancelQueries()
    client.clear()
  })
  return () => {
    unsubscribe()
    if (sessionVersion === getVersion) sessionVersion = () => 0
  }
}
export const queryClient = createQueryClient()
