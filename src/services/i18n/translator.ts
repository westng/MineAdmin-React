import type { LocaleRegistry } from './registry'

export interface TextTranslatorPorts {
  locales: Pick<LocaleRegistry, 'translate'>
  i18n: { store: { getState: () => { locale: string } } }
}

export type TextTranslator = (message: string, values?: Record<string, unknown>) => string
export function createTextTranslator(runtime: TextTranslatorPorts, namespace: string): TextTranslator {
  return (message, values = {}) =>
    runtime.locales
      .translate(runtime.i18n.store.getState().locale, namespace, message, message)
      .replace(/\{([^}]+)\}/g, (placeholder, key: string) => (key in values ? String(values[key]) : placeholder))
}
