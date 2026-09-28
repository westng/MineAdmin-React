import { useStore } from 'zustand'
import { useRuntime } from '@/hooks/runtime/use-runtime'
import type { SettingState } from './create-store'
export function useSettingStore<T = SettingState>(
  selector: (state: SettingState) => T = state => state as unknown as T,
) {
  return useStore(useRuntime().settings, selector)
}
