import { Fragment, useEffect, useState } from 'react'
import { NavLink, matchRoutes, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, CircleDot, LayoutDashboard, Search } from 'lucide-react'
import { useTranslate } from '@/hooks/i18n/use-translator'
import { useShell } from '@/layouts/hooks/use-shell'
import { useRoute } from '@/hooks/use-route'
import { useSettingStore } from '@/store/settings/use-settings'
import { MaIcon } from '@/components/ma-icon'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/reui/primitives/breadcrumb'
import { Button } from '@/components/reui/primitives/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/reui/primitives/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/reui/primitives/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/reui/primitives/sidebar'
import { flattenVisibleMenus, getMenuLabel, getMenuPath, isVisibleMenu } from '@/router/navigation/menu'
import type { MenuVo } from '@/services/navigation/types'
import HeaderActionSlot from '@/layouts/components/bars/toolbar'
import { VerveSectionNavigation } from './section-navigation'
import { VerveProfileMenu } from './profile-menu'
import { useVerveNavigation } from './navigation-context'
import { NotificationsButton } from '@/layouts/components/notifications'
import { ShellSlotOutlet } from '@/layouts/slot-outlet'

type RailItem = {
  label: string
  to: string
  icon?: string
  menu?: MenuVo
}

const logoMark = import.meta.url
  ? new URL('../../assets/images/logo-white.svg', import.meta.url).href
  : '/src/assets/images/logo-white.svg'

function getFirstMenuPath(menu: MenuVo): string | null {
  return getMenuPath(menu) || menu.children?.map(getFirstMenuPath).find((path): path is string => Boolean(path)) || null
}

function menuToRailItem(menu: MenuVo): RailItem | null {
  if (!isVisibleMenu(menu)) return null
  const to = getFirstMenuPath(menu)
  return to ? { label: getMenuLabel(menu), to, icon: menu.icon || menu.meta?.icon, menu } : null
}

function NavigationIcon({ icon, dashboard }: { icon?: string; dashboard?: boolean }) {
  if (icon) return <MaIcon name={icon} className="size-4" />
  const Icon = dashboard ? LayoutDashboard : CircleDot
  return <Icon className="size-4" aria-hidden="true" />
}

export default function VerveNavigation() {
  const t = useTranslate()
  const { isMobile, setOpenMobile } = useSidebar()
  const location = useLocation()
  const { menus } = useShell()
  const { section: activeSection, selectSection, clearSection } = useVerveNavigation()
  const dashboardPath = useSettingStore(state => state.settings.dashboardPage.path)
  const visibleItems = menus.map(menuToRailItem).filter((item): item is RailItem => Boolean(item))
  const items: RailItem[] = [{ label: t('首页'), to: dashboardPath }, ...visibleItems].filter(
    (item, index, list) => list.findIndex(candidate => candidate.to === item.to) === index,
  )
  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="w-[63px]! border-r-0 bg-transparent"
      style={{ top: 0, bottom: 0, height: '100svh', maxHeight: '100svh' }}
    >
      <div className="flex min-h-0 flex-1">
        <div
          className="flex min-h-0 w-12 shrink-0 flex-col items-center bg-sidebar md:bg-transparent"
          style={isMobile ? { width: 63, flexShrink: 0 } : undefined}
        >
          <SidebarHeader className="h-[52px] shrink-0 items-center justify-center p-0">
            <NavLink
              to={dashboardPath}
              onClick={() => {
                clearSection()
                setOpenMobile(false)
              }}
              aria-label={t('首页')}
              className="flex size-7 items-center justify-center rounded-lg bg-foreground p-1 outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img src={logoMark} alt="" className="size-full object-contain dark:invert" />
            </NavLink>
          </SidebarHeader>
          <SidebarContent className="min-h-0 w-full flex-1 overflow-y-auto! px-0 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SidebarGroup className="p-0">
              <SidebarMenu className="items-center gap-0.5">
                {items.map(item => {
                  const active = item.menu
                    ? item.menu === activeSection
                    : !activeSection && location.pathname === item.to
                  const isSection = item.menu?.children?.some(isVisibleMenu)
                  return (
                    <SidebarMenuItem key={item.to} className="w-8">
                      <SidebarMenuButton
                        isActive={active}
                        aria-label={item.label}
                        tooltip={{ children: item.label, hidden: isMobile }}
                        className="size-8! justify-center p-0!"
                        render={
                          isSection ? (
                            <button type="button" />
                          ) : (
                            <NavLink to={item.to} end={item.to === dashboardPath} />
                          )
                        }
                        onClick={() => {
                          if (isSection) {
                            selectSection(item.menu!)
                          } else {
                            clearSection()
                            setOpenMobile(false)
                          }
                        }}
                      >
                        <NavigationIcon icon={item.icon} dashboard={item.to === dashboardPath} />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="shrink-0 items-center px-0 py-2">
            <VerveProfileMenu />
          </SidebarFooter>
        </div>
        {isMobile && <VerveSectionNavigation mobile />}
      </div>
    </Sidebar>
  )
}

function SearchMenu({ menus }: { menus: MenuVo[] }) {
  const t = useTranslate()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'all' | 'section'>('all')
  const { section } = useVerveNavigation()
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(value => !value)
        setSearch('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const items = flattenVisibleMenus(scope === 'section' && section ? [section] : menus)
    .filter(menu => !(menu.children ?? []).some(isVisibleMenu))
    .map(menu => ({ label: getMenuLabel(menu), to: getMenuPath(menu) }))
    .filter((item): item is { label: string; to: string } => Boolean(item.to))
    .filter((item, index, list) => list.findIndex(candidate => candidate.to === item.to) === index)

  return (
    <>
      <div className="hidden items-center md:flex" data-verve-search="">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('搜索范围')}
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-[54px] gap-1 rounded-r-none border-r-0 px-1.5 text-[12.8px] font-medium"
              />
            }
          >
            {scope === 'section' && section ? t('当前') : t('全部')}
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setScope('all')}>{t('全部菜单')}</DropdownMenuItem>
            <DropdownMenuItem disabled={!section} onClick={() => setScope('section')}>
              {section ? getMenuLabel(section) : t('当前分组')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          aria-label={t('搜索菜单')}
          onClick={() => setOpen(true)}
          className="flex h-7 w-80 items-center gap-2 rounded-r-[10px] border border-border bg-background px-2 text-left text-sm text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <Search className="size-3.5 opacity-60" />
          <span className="flex-1">{t('搜索')}...</span>
          <span className="flex gap-1" aria-hidden="true">
            <kbd className="rounded bg-muted/60 px-1 text-xs leading-5">⌘</kbd>
            <kbd className="rounded bg-muted/60 px-1 text-xs leading-5">K</kbd>
          </span>
        </button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('搜索菜单')}
        onClick={() => setOpen(true)}
        className="size-7 md:hidden"
      >
        <Search className="size-4" />
      </Button>
      {open && (
        <CommandDialog
          open
          onOpenChange={nextOpen => {
            setOpen(nextOpen)
            if (!nextOpen) setSearch('')
          }}
          title={t('搜索菜单')}
          description={t('搜索并打开菜单页面')}
          className="h-auto min-h-12 max-h-[min(32rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-xl border p-0"
        >
          <Command className="h-auto max-h-[min(32rem,calc(100vh-2rem))] rounded-xl bg-background">
            <CommandInput
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={t('搜索菜单')}
              aria-label={t('搜索菜单')}
            />
            <CommandList className="max-h-72 overflow-y-auto p-3">
              <CommandEmpty>{t('没有匹配的菜单')}</CommandEmpty>
              {items.map(item => (
                <CommandItem
                  key={`verve-search-${item.to}`}
                  value={`${item.label} ${item.to}`}
                  onSelect={() => {
                    navigate(item.to)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  {item.label}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </CommandDialog>
      )}
    </>
  )
}

export function VerveHeader() {
  const t = useTranslate()
  const { menus } = useShell()
  const location = useLocation()
  return (
    <>
      <header
        data-verve-header=""
        className="relative z-20 flex h-(--header-height) w-full shrink-0 items-center gap-2 border-b border-border bg-background pr-2 pl-2.5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <SidebarTrigger className="size-7 shrink-0 md:hidden" aria-label={t('shell.openNavigation')} />
          <VerveBreadcrumb />
        </div>
        <div className="flex shrink-0 items-center">
          <SearchMenu menus={menus} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 [&>button]:h-7 [&>button]:text-[12.8px]">
          <ShellSlotOutlet slot="shell.toolbar" pathname={location.pathname} />
          <HeaderActionSlot />
          <NotificationsButton className="size-7 [&_svg]:opacity-60" />
        </div>
      </header>
    </>
  )
}

function VerveBreadcrumb() {
  const t = useTranslate()
  const { routes } = useRoute()
  const { pathname } = useLocation()
  const dashboardPath = useSettingStore(state => state.settings.dashboardPage.path)
  // 面包屑来自当前路由的 meta.breadcrumb，由菜单拍平时生成。
  const route = matchRoutes(routes, pathname)?.at(-1)?.route
  const trail = pathname === dashboardPath ? [] : (route?.meta?.breadcrumb ?? [])
  return (
    <Breadcrumb className="flex min-w-0 items-center overflow-hidden" aria-label={t('页面')}>
      <BreadcrumbList className="min-w-0 flex-nowrap gap-2 text-[12.8px]">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink asChild>
            <NavLink to={dashboardPath}>{t('首页')}</NavLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {trail.map((item, index) => (
          <Fragment key={`${item.path}-${index}`}>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3.5" />
            </BreadcrumbSeparator>
            <BreadcrumbItem className="min-w-0">
              {index === trail.length - 1 ? (
                <BreadcrumbPage className="truncate">
                  {item.i18n ? t(item.i18n, item.title) : item.title}
                </BreadcrumbPage>
              ) : (
                <span className="truncate">{item.i18n ? t(item.i18n, item.title) : item.title}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
