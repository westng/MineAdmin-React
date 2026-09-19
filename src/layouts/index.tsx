import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useTranslate } from '@/provider/i18n'
import Tabbar from './components/bars/tabbar'
import { Outlet, useLocation } from 'react-router-dom'
import { useState, useSyncExternalStore, type CSSProperties } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/reui/primitives/sidebar'
import { TooltipProvider } from '@/components/reui/primitives/tooltip'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import { useLayout } from '@/hooks/shell/use-layout'
import BackTop from './components/back-top'
import Header from './components/header'
import { HeaderActionsProvider } from './components/bars/toolbar'
import { cn } from '@/utils/cn'
import { ShellProvider } from './shell-provider'
import { ShellSlotOutlet } from './slot-outlet'
import { shellPagePolicies } from './slots'

const tx = createTextTranslator('shell.ui')

function getSidebarDefaultOpen() {
  if (typeof document === 'undefined') return true
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === 'true' : true
}
export default function AppLayout() {
  const localeRevision = useLocaleRevision()
  void localeRevision

  const t = useTranslate()
  const location = useLocation()
  const [sidebarDefaultOpen] = useState(getSidebarDefaultOpen)
  const layout = useLayout()
  const policies = useSyncExternalStore(
    shellPagePolicies.subscribe,
    shellPagePolicies.getSnapshot,
    shellPagePolicies.getSnapshot,
  )
  const policy = policies.find(item => item.path === location.pathname)
  const Navigation = layout.navigation
  const HeaderNavigation = layout.headerNavigation
  return (
    <ShellProvider>
      <SidebarProvider
        data-layout={layout.id}
        defaultOpen={sidebarDefaultOpen}
        className="flex h-svh min-h-0 flex-col overflow-hidden [--sidebar-accent:color-mix(in_oklab,var(--color-primary)_5%,transparent)] [--sidebar-accent-foreground:var(--color-primary)]"
        style={
          {
            '--sidebar-width': '260px',
            '--sidebar-width-icon': '62px',
            '--header-height': '50px',
            '--shell-header-height': HeaderNavigation ? '94px' : '50px',
            minHeight: 0,
          } as CSSProperties
        }
      >
        <TooltipProvider>
          <HeaderActionsProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
            >
              {t('shell.skipContent')}
            </a>
            <Header className="shrink-0" />
            {HeaderNavigation && (
              <div className="h-11 shrink-0 overflow-hidden">
                <HeaderNavigation />
              </div>
            )}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <ErrorBoundary label={tx('导航')}>
                <Navigation />
              </ErrorBoundary>
              <ShellSlotOutlet slot="shell.pane" pathname={location.pathname} />
              <SidebarInset className="min-w-0 min-h-0 flex-1 overflow-hidden">
                <Tabbar />
                <main
                  id="main-content"
                  tabIndex={-1}
                  className={cn(
                    'mine-main flex min-h-0 flex-1 flex-col',
                    policy?.overflow === 'hidden' ? 'overflow-hidden' : 'overflow-y-auto',
                    policy?.padding !== false && 'p-4',
                  )}
                >
                  <Outlet />
                </main>
              </SidebarInset>
            </div>
          </HeaderActionsProvider>
          <BackTop />
          <ShellSlotOutlet slot="shell.overlays" pathname={location.pathname} />
        </TooltipProvider>
      </SidebarProvider>
    </ShellProvider>
  )
}
