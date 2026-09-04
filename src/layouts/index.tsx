import { Outlet, useLocation } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSettingStore } from '@/provider/settings'
import Watermark from '@/components/Watermark'
import BackTop from './components/back-top'
import Header from './components/header'
import MainAside, { SidebarCollapseRail } from './components/main-aside'
import { HeaderActionsProvider } from './components/bars/toolbar'
import { cn } from '@/lib/utils'

function getSidebarDefaultOpen() {
  if (typeof document === 'undefined') return true

  const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/)
  return match ? match[1] === 'true' : true
}

export default function AppLayout() {
  const location = useLocation()
  const watermark = useSettingStore(state => state.settings.app.enableWatermark)
  const watermarkText = useSettingStore(state => state.settings.app.watermarkText)
  const [sidebarDefaultOpen] = useState(getSidebarDefaultOpen)
  const isMarketingWorkspace = location.pathname === '/marketing/schedule' || location.pathname === '/marketing/calendar'

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      className="h-svh overflow-hidden [--sidebar-accent:color-mix(in_oklab,var(--color-primary)_5%,transparent)] [--sidebar-accent-foreground:var(--color-primary)]"
      style={{ '--sidebar-width': '350px', '--header-height': '50px' } as CSSProperties}
    >
      <TooltipProvider>
        <MainAside />
        <SidebarCollapseRail />
        <SidebarInset className="min-w-0">
          <HeaderActionsProvider>
            <Header />
            <main className={cn('mine-main flex min-h-0 flex-1 flex-col overflow-y-auto', !isMarketingWorkspace && 'p-4')}>
              <Outlet />
            </main>
          </HeaderActionsProvider>
        </SidebarInset>
        {watermark && <Watermark text={watermarkText} />}
        <BackTop />
      </TooltipProvider>
    </SidebarProvider>
  )
}
