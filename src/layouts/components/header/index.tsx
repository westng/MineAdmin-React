import { Gauge } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { findMenuByPath, getMenuLabel } from '@/router/dynamic-menu'
import { useMenuStore } from '@/store/modules/useMenuStore'
import HeaderActionSlot from '@/layouts/components/bars/toolbar'

const brandLogo = new URL('../../../assets/images/logo.svg', import.meta.url).href

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/settings': 'Settings',
  '/uc/index': 'Profile',
  '/uc/settings': 'Settings',
}

export default function Header({ className }: { className?: string }) {
  const location = useLocation()
  const menus = useMenuStore(state => state.menus)
  const dynamicMenu = findMenuByPath(menus, location.pathname)
  const title = titles[location.pathname] || (dynamicMenu ? getMenuLabel(dynamicMenu) : 'Dashboard')

  return <header className={`sticky top-0 z-20 flex h-(--header-height) min-w-0 items-center gap-2 border-b border-border bg-background px-3 sm:gap-3 sm:px-4 ${className || ''}`}>
    <SidebarTrigger className="shrink-0 md:hidden" aria-label="打开导航菜单" />
    <img src={brandLogo} alt="博策云工作台" className="h-6 w-auto max-w-40 shrink-0 object-contain" />
    <span className="text-muted-foreground">/</span>
    <h1 className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-base">{title}</h1>
    <div className="ml-auto flex shrink-0 items-center gap-2"><Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5"><Gauge className="size-3.5" aria-hidden="true" /><span className="hidden sm:inline">Store</span><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">Attention</span></Button><HeaderActionSlot /></div>
  </header>
}
