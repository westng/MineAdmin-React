import { useStore } from 'zustand'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import type { DictionaryState } from '../services/dictionary/manager'
export type { Dictionary } from '../services/dictionary/manager'
export function useDictStore<T = DictionaryState>(
  selector: (state: DictionaryState) => T = state => state as unknown as T,
) {
  return useStore(useRuntime().dictionaries.store, selector)
}
