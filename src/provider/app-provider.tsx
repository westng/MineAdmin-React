import { TableRequestContext } from '@/components/ma-pro-table/utils/request-store'
import { createTableRequestStore } from './query/table-adapter'
import { TableCellRenderersContext } from '@/components/ma-table'
import { ProTableToolbarsContext } from '@/components/ma-pro-table'
import { PortalContainerContext } from '@/components/reui/primitives/portal-container'
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { MaDictionaryContext, type MaDictionarySource } from '@/components/ma-dict-select'
import { QueryClientProvider } from '@tanstack/react-query'
import { MaRemoteSelectProvider, type MaRemoteSelectRequest } from '@/components/ma-remote-select'
import { ToastProvider } from '@/components/reui/toast'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import { reportError } from '@/services/telemetry'
import { useStore } from 'zustand'
import { RuntimeContext } from './runtime/context'
import { type AppRuntime } from './runtime/types'
export function AppProviders({ runtime, children }: PropsWithChildren<{ runtime: AppRuntime }>) {
  const dictionarySource = useMemo<MaDictionarySource>(
    () => ({
      subscribe: runtime.dictionaries.store.subscribe,
      getSnapshot: () => runtime.dictionaries.store.getState().dictionaries,
      subscribeLocale: runtime.i18n.store.subscribe,
      getLocaleSnapshot: () => {
        const { locale, revision } = runtime.i18n.store.getState()
        return `${locale}:${revision}`
      },
      translate: (key, fallback) =>
        runtime.locales.translate(runtime.i18n.store.getState().locale, 'app', key, fallback),
    }),
    [runtime],
  )
  const tableRequests = useCallback(
    (id: string) => createTableRequestStore(runtime.query, () => runtime.session.getState().sessionVersion, id),
    [runtime],
  )
  const [scope, setScope] = useState<HTMLDivElement | null>(null)
  const colorMode = useStore(runtime.settings, state => state.settings.app.colorMode)
  const primaryColor = useStore(runtime.settings, state => state.settings.app.primaryColor)
  const remoteSelectRequest = useCallback<MaRemoteSelectRequest>(config => runtime.http.request(config), [runtime.http])
  useEffect(() => {
    if (!scope) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      scope.classList.toggle('dark', colorMode === 'dark' || (colorMode === 'autoMode' && media.matches))
    apply()
    if (primaryColor) scope.style.setProperty('--primary', primaryColor)
    if (colorMode !== 'autoMode') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [colorMode, primaryColor, scope])
  return (
    <RuntimeContext.Provider value={runtime}>
      <div ref={setScope} data-app-scope="" className="contents">
        <PortalContainerContext.Provider value={scope}>
          <QueryClientProvider client={runtime.query}>
            <ToastProvider theme={colorMode === 'autoMode' ? 'system' : colorMode}>
              <MaRemoteSelectProvider request={remoteSelectRequest}>
                <ErrorBoundary label="应用" onError={error => reportError(runtime.telemetry, error, 'app')}>
                  <TableCellRenderersContext.Provider value={runtime.tableCellRenderers}>
                    <ProTableToolbarsContext.Provider value={runtime.proTableToolbars}>
                      <MaDictionaryContext.Provider value={dictionarySource}>
                        <TableRequestContext.Provider value={tableRequests}>{children}</TableRequestContext.Provider>
                      </MaDictionaryContext.Provider>
                    </ProTableToolbarsContext.Provider>
                  </TableCellRenderersContext.Provider>
                </ErrorBoundary>
              </MaRemoteSelectProvider>
            </ToastProvider>
          </QueryClientProvider>
        </PortalContainerContext.Provider>
      </div>
    </RuntimeContext.Provider>
  )
}
