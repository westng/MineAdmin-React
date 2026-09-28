import { useStore } from 'zustand'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import type { KeepAliveState } from './create-store'
export type { KeepAliveState } from './create-store'
export function useKeepAliveStore<T = KeepAliveState>(
  selector: (state: KeepAliveState) => T = state => state as unknown as T,
) {
  return useStore(useRuntime().keepAlive, selector)
}
