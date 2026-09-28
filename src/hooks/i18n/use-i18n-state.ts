import { useStore } from 'zustand'
import { useRuntime } from '../runtime/use-runtime'
import type { I18nState } from '@/services/i18n/manager'

export function useI18nStore<T = I18nState>(selector: (state: I18nState) => T = state => state as unknown as T) {
  return useStore(useRuntime().i18n.store, selector)
}

export function useLocaleRevision() {
  return useI18nStore(state => `${state.locale}:${state.revision}`)
}
