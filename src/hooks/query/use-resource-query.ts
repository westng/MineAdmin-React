import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRuntime } from '../runtime/use-runtime'
import { useSession } from '../auth/use-session'
import { fetchResourceQuery } from '@/services/query/resource'
export function useResourceQuery<P extends object, T>(
  options: (parameters: P) => {
    queryKey: readonly unknown[]
    queryFn: (context: { signal: AbortSignal }) => Promise<T>
  },
) {
  const runtime = useRuntime()
  const sessionVersion = useSession(state => state.sessionVersion)
  const [parameters, setParameters] = useState<P | null>(null)
  const query = useQuery({ ...options(parameters ?? ({} as P)), enabled: parameters !== null }, runtime.query)
  const request = useCallback(
    (next: P, signal?: AbortSignal) => {
      setParameters(next)
      return fetchResourceQuery(runtime.query, options(next), signal)
    },
    [options, runtime],
  )
  return { ...query, request, sessionVersion }
}
