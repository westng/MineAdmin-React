import type { LocaleRegistry } from './registry'
export interface LocaleBundle {
  namespace: string
  messages: Record<string, Record<string, string>>
}
export function registerLocaleBundles(registry: LocaleRegistry, modules: Record<string, { default?: LocaleBundle }>) {
  const disposers: Array<() => void> = []
  try {
    for (const [id, module] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
      const bundle = module.default
      if (!bundle) throw new Error(`Missing locale bundle: ${id}`)
      for (const [locale, messages] of Object.entries(bundle.messages)) {
        if (Object.values(messages).some(value => typeof value !== 'string'))
          throw new Error(`Invalid locale messages: ${id}`)
        disposers.push(registry.register({ id: `${id}:${locale}`, locale, namespace: bundle.namespace, messages }))
      }
    }
  } catch (error) {
    disposers.reverse().forEach(dispose => dispose())
    throw error
  }
  return () => {
    disposers.reverse().forEach(dispose => dispose())
  }
}
