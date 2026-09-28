import { useSyncExternalStore } from 'react'
import { useI18nStore } from '@/hooks/i18n/use-i18n-state'
import { useRuntime } from '../runtime/use-runtime'
export function useLocale(namespace = 'app') {
  const { locales, session } = useRuntime()
  useSyncExternalStore(locales.subscribe, locales.getSnapshot, locales.getSnapshot)
  const locale = useI18nStore(state => state.locale)
  const setLocale = useI18nStore(state => state.setLocale)
  return {
    locale,
    setLocale: (value: string) => {
      setLocale(value)
      session.getState().setLanguage(value)
    },
    t: (key: string, fallback?: string) => locales.translate(locale, namespace, key, fallback),
    available: locales.getLocales(),
  }
}
