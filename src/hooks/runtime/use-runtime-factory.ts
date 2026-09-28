import { useMemo } from 'react'
import type { AppRuntime } from '@/provider/runtime/types'
import { useRuntime } from './use-runtime'

/** Bind every API operation to the provider's HTTP, session and query instances. */
export function useRuntimeFactory<T>(create: (runtime: AppRuntime) => T): T {
  const runtime = useRuntime()
  return useMemo(() => create(runtime), [create, runtime])
}
