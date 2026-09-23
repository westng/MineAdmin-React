import { useTranslate } from '@/provider/i18n'
import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/reui/primitives/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/reui/primitives/breadcrumb'
import { findMenuByPath, findMenuTrail, getMenuLabel } from '@/router/dynamic-menu'
import { useRoute } from '@/hooks/framework/use-route'
import HeaderActionSlot from '@/layouts/components/bars/toolbar'
import { NotificationsButton } from '@/layouts/components/notifications'

import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { cn } from '@/utils/cn'

const logo = import.meta.url
  ? new URL('../../../assets/images/logo.svg', import.meta.url).href
  : '/src/assets/images/logo.svg'

const titles: Record<string, string> = {
  '/dashboard': 'shell.dashboard',
  '/settings': 'shell.settings',
  '/uc/index': 'shell.profile',
  '/uc/settings': 'shell.settings',
}

export default function Header({ className }: { className?: string }) {
  const t = useTranslate()
  const location = useLocation()
  const { menus } = useRoute()
  const dynamicMenu = findMenuByPath(menus, location.pathname)
  const menuTrail = findMenuTrail(menus, location.pathname)
  const title = titles[location.pathname]
    ? t(titles[location.pathname])
    : dynamicMenu
      ? getMenuLabel(dynamicMenu)
      : t('shell.dashboard')

  return (
    <header
      className={cn('sticky top-0 z-50 flex w-full items-center border-b border-border bg-background', className)}
    >
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <SidebarTrigger className="shrink-0 md:hidden" aria-label={t('shell.openNavigation')} />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap gap-2">
            <BreadcrumbItem className="hidden shrink-0 items-center pl-0.5 md:inline-flex">
              <img src={logo} alt="博策云工作台" className="h-5 w-auto max-w-40 object-contain" />
            </BreadcrumbItem>
            {menuTrail.length > 0 ? (
              menuTrail.map((item, index) => {
                const current = index === menuTrail.length - 1
                const label = current
                  ? title
                  : typeof item.menu.meta?.i18n === 'string'
                    ? t(item.menu.meta.i18n, getMenuLabel(item.menu))
                    : getMenuLabel(item.menu)
                return (
                  <Fragment key={`${item.path}-${label}`}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem className="min-w-0">
                      {current ? (
                        <BreadcrumbPage className="truncate text-sm">{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild className="truncate text-sm">
                          <Link to={item.path}>{label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                )
              })
            ) : (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate text-sm">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ShellSlotOutlet slot="shell.toolbar" pathname={location.pathname} />
          <HeaderActionSlot />
          <NotificationsButton />
        </div>
      </div>
    </header>
  )
}
