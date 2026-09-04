import { FilePlus2, Filter, Plus, Send, UserPlus, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useLocation } from 'react-router-dom'
import { findMenuByPath, getMenuLabel } from '@/router/dynamic-menu'
import { useMenuStore } from '@/store/modules/useMenuStore'
import HeaderActionSlot from '@/layouts/components/bars/toolbar'

const titles: Record<string, string> = {
  '/dashboard': '工作台',
  '/calendar': 'Calendar',
  '/appointments': 'Appointments',
  '/customers': 'Customers',
  '/staff': 'Staff',
  '/payments': 'Payments',
  '/settings': '设置',
  '/uc/index': '个人资料',
  '/uc/settings': '系统设置',
}

function ActionButton({
  children,
  icon: Icon,
  ...props
}: ComponentProps<typeof Button> & { icon: LucideIcon }) {
  return (
    <Button {...props}>
      <Icon className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{children}</span>
    </Button>
  )
}

export default function Header() {
  const location = useLocation()
  const menus = useMenuStore(state => state.menus)
  const dynamicMenu = findMenuByPath(menus, location.pathname)
  const title = titles[location.pathname] || (location.pathname.startsWith('/settings') ? '设置' : (dynamicMenu ? getMenuLabel(dynamicMenu) : 'Clinic'))
  const isCalendar = location.pathname === '/calendar'
  const isAppointments = location.pathname === '/appointments'
  const isCustomers = location.pathname === '/customers'
  const isStaff = location.pathname === '/staff'
  const isPayments = location.pathname === '/payments'

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) min-w-0 items-center gap-2 border-b border-border bg-background px-4 py-1.5 sm:gap-3">
      <SidebarTrigger className="shrink-0 md:hidden" />
      <h1 className="min-w-0 truncate text-base font-semibold text-foreground sm:text-lg">{title}</h1>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {isCalendar && <ActionButton icon={Plus} variant="default">New Booking</ActionButton>}
        {isAppointments && <ActionButton icon={Send} variant="outline">Send reminders</ActionButton>}
        {isCustomers && <ActionButton icon={UserPlus} variant="default">Add Patient</ActionButton>}
        {isStaff && <ActionButton icon={Filter} variant="outline">Filters</ActionButton>}
        {isStaff && <ActionButton icon={FilePlus2} variant="default">New visit</ActionButton>}
        {isPayments && <ActionButton icon={Plus} variant="default">New invoice</ActionButton>}
        <HeaderActionSlot />
      </div>
    </header>
  )
}
