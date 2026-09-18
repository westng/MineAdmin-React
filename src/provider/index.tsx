import { useEffect, type PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/reui/toast'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import { reportError } from '@/services/telemetry'
import { useSettingStore } from '@/provider/settings'
import { RuntimeContext, type AppRuntime } from './runtime/context'
export function AppProviders({ runtime, children }: PropsWithChildren<{ runtime: AppRuntime }>) {
  const colorMode = useSettingStore(state => state.settings.app.colorMode)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      document.documentElement.classList.toggle(
        'dark',
        colorMode === 'dark' || (colorMode === 'autoMode' && media.matches),
      )
    apply()
    if (colorMode !== 'autoMode') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [colorMode])
  return (
    <RuntimeContext.Provider value={runtime}>
      <QueryClientProvider client={runtime.query}>
        <ToastProvider theme={colorMode === 'autoMode' ? 'system' : colorMode}>
          <ErrorBoundary label="应用" onError={error => reportError(runtime.telemetry, error, 'app')}>
            {children}
          </ErrorBoundary>
        </ToastProvider>
      </QueryClientProvider>
    </RuntimeContext.Provider>
  )
}
