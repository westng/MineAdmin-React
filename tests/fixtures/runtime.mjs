import { createElement } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'

// Bundle these exports with the component under test so contexts have identical identity.
export const runtimeExports = `
 export { createAppRuntime } from './src/app/runtime/create-runtime'
 export { RuntimeContext } from './src/provider/runtime/context'
 export { MaDictionaryContext } from './src/components/ma-dict-select'
 export { ToastContext } from './src/components/reui/toast-context'
`
export function createRuntimeFixture(core, http, notify = () => {}) {
  const runtime = core.createAppRuntime({ storage: { getItem: () => null, setItem() {}, removeItem() {} } })
  Object.assign(runtime.http, http)
  const toast = Object.fromEntries(
    ['success', 'error', 'warning', 'info'].map(kind => [kind, message => notify({ kind, message })]),
  )
  return {
    runtime,
    wrap: element =>
      createElement(
        core.RuntimeContext.Provider,
        { value: runtime },
        createElement(
          QueryClientProvider,
          { client: runtime.query },
          createElement(
            core.MaDictionaryContext.Provider,
            {
              value: {
                subscribe: runtime.dictionaries.store.subscribe,
                getSnapshot: () => runtime.dictionaries.store.getState().dictionaries,
                subscribeLocale: runtime.i18n.store.subscribe,
                getLocaleSnapshot: () => {
                  const { locale, revision } = runtime.i18n.store.getState()
                  return `${locale}:${revision}`
                },
                translate: (key, fallback) =>
                  runtime.locales.translate(runtime.i18n.store.getState().locale, 'app', key, fallback),
              },
            },
            createElement(core.ToastContext.Provider, { value: { toast } }, element),
          ),
        ),
      ),
  }
}
