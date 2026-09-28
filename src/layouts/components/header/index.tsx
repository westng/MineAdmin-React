import { useTranslate } from '@/hooks/i18n/use-translator'
import { Fragment } from 'react'
import { Link, matchRoutes, useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/reui/primitives/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/reui/primitives/breadcrumb'
import type { RouteBreadcrumb } from '@/router/types'
import { useRoute } from '@/hooks/use-route'
import HeaderActionSlot from '@/layouts/components/bars/toolbar'
import { NotificationsButton } from '@/layouts/components/notifications'

import { ShellSlotOutlet } from '@/layouts/slot-outlet'
import { cn } from '@/utils/cn'

const logo = import.meta.url
  ? new URL('../../../assets/images/logo.svg', import.meta.url).href
  : '/src/assets/images/logo.svg'

export default function Header({ className }: { className?: string }) {
  const t = useTranslate()
  const location = useLocation()
  const { routes } = useRoute()
  // 面包屑来自当前路由的 meta.breadcrumb，由菜单拍平时生成。
  const route = matchRoutes(routes, location.pathname)?.at(-1)?.route
  const breadcrumb = route?.meta?.breadcrumb ?? []
  const labelOf = (item: RouteBreadcrumb) => (item.i18n ? t(item.i18n, item.title) : (item.title ?? ''))

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
            {breadcrumb.map((item, index) => {
              const current = index === breadcrumb.length - 1
              const label = labelOf(item)
              return (
                <Fragment key={`${item.path}-${index}`}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem className="min-w-0">
                    {current || !item.path ? (
                      <BreadcrumbPage className="truncate text-sm">{label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild className="truncate text-sm">
                        <Link to={item.path}>{label}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              )
            })}
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
