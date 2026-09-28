import { useStore } from 'zustand'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import type { TabState } from './create-store'
export type { TabState, TabItem } from './create-store'
export function useTabStore<T = TabState>(selector: (state: TabState) => T = state => state as unknown as T) {
  return useStore(useRuntime().tabs, selector)
}
