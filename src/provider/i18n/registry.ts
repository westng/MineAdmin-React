import { createRegistry } from '@/services/registry'
export type LocaleCode = string
export interface LocaleRegistration {
  id: string
  locale: LocaleCode
  namespace: string
  messages: Readonly<Record<string, string>>
  order?: number
}
export function createLocaleRegistry(fallbackLocale: LocaleCode = 'zh_CN') {
  const registry = createRegistry<LocaleRegistration>()
  return {
    ...registry,
    register(value: LocaleRegistration) {
      if (!value.locale.trim() || !value.namespace.trim()) throw new Error('Locale and namespace are required')
      const conflict = registry
        .getSnapshot()
        .some(
          entry =>
            entry.locale === value.locale &&
            entry.namespace === value.namespace &&
            Object.keys(value.messages).some(key => Object.hasOwn(entry.messages, key)),
        )
      if (conflict) throw new Error(`Locale key conflict: ${value.locale}/${value.namespace}`)
      return registry.register({ ...value, messages: Object.freeze({ ...value.messages }) })
    },
    translate(locale: string, namespace: string, key: string, fallback?: string) {
      for (const language of new Set([locale, fallbackLocale])) {
        for (const entry of registry.getSnapshot()) {
          if (entry.locale === language && entry.namespace === namespace && Object.hasOwn(entry.messages, key))
            return entry.messages[key]
        }
      }
      return fallback ?? key
    },
    getLocales: () => [...new Set(registry.getSnapshot().map(entry => entry.locale))],
  }
}
export type LocaleRegistry = ReturnType<typeof createLocaleRegistry>
export const localeRegistry = createLocaleRegistry()
