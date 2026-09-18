import { useSyncExternalStore } from 'react'
import { useRuntime } from './use-runtime'
export function useRoute() {
  const { routes } = useRuntime()
  return useSyncExternalStore(routes.subscribe, routes.getSnapshot, routes.getSnapshot)
}
