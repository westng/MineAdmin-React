import { useCallback } from 'react'
import { useRuntime } from '../runtime/use-runtime'
import { useLocaleRevision } from './use-i18n-state'
import { createTextTranslator, type TextTranslator } from '@/services/i18n/translator'

export function useTextTranslator(namespace: string): TextTranslator {
  const runtime = useRuntime()
  const revision = useLocaleRevision()
  return useCallback(
    (message, values) => {
      void revision
      return createTextTranslator(runtime, namespace)(message, values)
    },
    [runtime, namespace, revision],
  )
}
export function useTranslate() {
  const runtime = useRuntime()
  const revision = useLocaleRevision()
  return useCallback(
    (key: string, fallback?: string) => {
      void revision
      return runtime.locales.translate(runtime.i18n.store.getState().locale, 'app', key, fallback)
    },
    [runtime, revision],
  )
}
export function useTrans(key: string, fallback?: string) {
  return useTranslate()(key, fallback)
}
