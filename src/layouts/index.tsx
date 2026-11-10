import { useRuntime } from '@/hooks/runtime/use-runtime'
import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useTranslate } from '@/hooks/i18n/use-translator'
import Tabbar from './components/bars/tabbar'
import { Outlet, useLocation } from 'react-router-dom'
import { useState, useSyncExternalStore, type CSSProperties, type MouseEvent } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/reui/primitives/sidebar'
import { TooltipProvider } from '@/components/reui/primitives/tooltip'
import { ErrorBoundary } from '@/components/reui/error-boundary'
import { useLayout } from '@/layouts/hooks/use-layout'
import BackTop from './components/back-top'
import Header from './components/header'
import { HeaderActionsProvider } from './components/bars/toolbar'
import { cn } from '@/utils/cn'
import { ShellProvider } from './shell-provider'
import { ShellSlotOutlet } from './slot-outlet'
import type { LayoutDefinition } from './registry'
import { useSettingStore } from '@/store/settings/use-settings'
import { VerveHeader } from './verve'
import { VerveSectionNavigation, VerveSectionToggle } from './verve/section-navigation'
import { VerveNavigationProvider } from './verve/navigation-provider'
import { NotificationsDrawer } from './components/notifications'
import AiAgents from './components/ai-agents'

function getSidebarDefaultOpen() {
  if (typeof document === 'undefined') return true
  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === 'true' : true
}
function focusMainContent(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  event.currentTarget.closest('[data-layout]')?.querySelector<HTMLElement>('main#main-content')?.focus()
}
export default function AppLayout() {
  const layout = useLayout()

  return (
    <ShellProvider>
      <DefaultLayout layout={layout} />
      <NotificationsDrawer />
    </ShellProvider>
  )
}

function DefaultLayout({ layout }: { layout: LayoutDefinition }) {
  const tx = useTextTranslator('shell.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const t = useTranslate()
  const location = useLocation()
  const contentWidth = useSettingStore(state => state.settings.app.contentWidth)
  const [sidebarDefaultOpen] = useState(getSidebarDefaultOpen)
  const shellPagePolicies = useRuntime().pagePolicies
  const policies = useSyncExternalStore(
    shellPagePolicies.subscribe,
    shellPagePolicies.getSnapshot,
    shellPagePolicies.getSnapshot,
  )
  const policy = policies.find(item => item.path === location.pathname)
  const Navigation = layout.navigation
  const HeaderNavigation = layout.headerNavigation
  const inset = layout.shell === 'inset'

  // Keep the Outlet's ancestors stable so layout previews preserve page state and navigation blockers.
  return (
    <SidebarProvider
      data-layout={layout.id}
      defaultOpen={sidebarDefaultOpen}
      className={cn(
        'flex h-svh min-h-0 flex-col overflow-hidden',
        inset
          ? 'bg-muted/20 [--sidebar-accent:color-mix(in_oklab,var(--foreground)_5%,transparent)] [--sidebar-accent-foreground:var(--foreground)]'
          : '[--sidebar-accent:color-mix(in_oklab,var(--color-primary)_5%,transparent)] [--sidebar-accent-foreground:var(--color-primary)]',
      )}
      style={
        {
          '--sidebar-width': inset ? '63px' : '260px',
          '--sidebar-width-icon': inset ? '47px' : '62px',
          '--header-height': '50px',
          '--shell-header-height': !inset && HeaderNavigation ? '94px' : '50px',
          minHeight: 0,
        } as CSSProperties
      }
    >
      <TooltipProvider>
        <HeaderActionsProvider>
          <VerveNavigationProvider className={cn('flex-col overflow-hidden', inset && 'verve-shell')}>
            <a
              href="#main-content"
              onClick={focusMainContent}
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-2"
            >
              {t('shell.skipContent')}
            </a>
            {!inset && <Header className="shrink-0" />}
            {!inset && HeaderNavigation && (
              <div className="h-11 shrink-0 overflow-hidden">
                <HeaderNavigation />
              </div>
            )}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <ErrorBoundary label={tx('导航')}>
                <Navigation />
              </ErrorBoundary>
              {!inset && <ShellSlotOutlet slot="shell.pane" pathname={location.pathname} />}
              <SidebarInset
                className={cn(
                  'min-h-0 min-w-0 flex-1 overflow-hidden',
                  inset &&
                    'border border-border shadow-none md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0',
                )}
              >
                {inset && <VerveHeader />}
                <div className="flex min-h-0 flex-1 overflow-hidden">
                  {inset && <VerveSectionNavigation />}
                  {inset && <ShellSlotOutlet slot="shell.pane" pathname={location.pathname} />}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    {!inset && <Tabbar />}
                    <main
                      id="main-content"
                      tabIndex={-1}
                      className={cn(
                        'mine-main flex min-h-0 min-w-0 flex-1 flex-col [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                        policy?.overflow === 'hidden' ? 'overflow-hidden' : 'overflow-y-auto',
                      )}
                    >
                      <div className={cn('w-full', contentWidth !== 'full' && 'mx-auto max-w-7xl')}>
                        <div className={cn('w-full', policy?.padding !== false && 'p-4 md:p-6')}>
                          <Outlet />
                        </div>
                      </div>
                    </main>
                  </div>
                  <AiAgents />
                </div>
              </SidebarInset>
            </div>
            {inset && <VerveSectionToggle />}
            <BackTop />
            <ShellSlotOutlet slot="shell.overlays" pathname={location.pathname} />
          </VerveNavigationProvider>
        </HeaderActionsProvider>
      </TooltipProvider>
    </SidebarProvider>
  )
}
