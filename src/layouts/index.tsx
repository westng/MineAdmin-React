import { Outlet, useLocation } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import BackTop from './components/back-top'
import Header from './components/header'
import MainAside from './components/main-aside'
import { HeaderActionsProvider } from './components/bars/toolbar'
import { cn } from '@/lib/utils'
import MarketingScheduleDrawer from '@/modules/marketing/schedule/components/MarketingScheduleDrawer'

function getSidebarDefaultOpen() {
  if (typeof document === 'undefined') return true

  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === 'true' : true
}

export default function AppLayout() {
  const location = useLocation()
  const [sidebarDefaultOpen] = useState(getSidebarDefaultOpen)
  const isMarketingWorkspace = location.pathname === '/marketing/schedule'
  const isDictionaryWorkspace = location.pathname === '/dataCenter/dictionary'

  return (
    <div
      className="h-svh"
      style={{ '--header-height': '50px' } as CSSProperties}
    >
      <SidebarProvider
        defaultOpen={sidebarDefaultOpen}
        className="flex h-full min-h-0 flex-col overflow-hidden [--sidebar-accent:color-mix(in_oklab,var(--color-primary)_5%,transparent)] [--sidebar-accent-foreground:var(--color-primary)]"
        style={{ '--sidebar-width': '260px', '--sidebar-width-icon': '62px' } as CSSProperties}
      >
        <TooltipProvider>
          <HeaderActionsProvider>
            <Header className="shrink-0" />
            <div className="flex min-h-0 flex-1">
              <MainAside />
              <SidebarInset className="min-w-0 min-h-0 flex-1 overflow-hidden">
                <main className={cn('mine-main flex min-h-0 flex-1 flex-col', isDictionaryWorkspace ? 'overflow-hidden' : 'overflow-y-auto', !isMarketingWorkspace && 'p-4')}>
                  <Outlet />
                </main>
              </SidebarInset>
            </div>
          </HeaderActionsProvider>
          <BackTop />
          <MarketingScheduleDrawer />
        </TooltipProvider>
      </SidebarProvider>
    </div>
  )
}
