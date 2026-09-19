import { Fragment, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronsUpDown, CircleDot, LayoutDashboard, LogOut, Search, Settings, UserRound } from 'lucide-react'
import { createTextTranslator, useTranslate } from '@/provider/i18n'
import { useShell } from '@/hooks/shell/use-shell'
import { useRoute } from '@/hooks/framework/use-route'
import { useSession } from '@/hooks/framework/use-session'
import { MaIcon } from '@/components/ma-icon'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/reui/primitives/avatar'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/reui/primitives/sidebar'
import { findMenuByPath, findMenuTrail, flattenVisibleMenus, getMenuLabel, getMenuPath } from '@/router/dynamic-menu'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'
import HeaderActionSlot from '@/layouts/components/bars/toolbar'

const tx = createTextTranslator('shell.ui')

type RailItem = {
  label: string
  to: string
  icon?: string
}

const logoMark = import.meta.url
  ? new URL('../../assets/images/logo-white.svg', import.meta.url).href
  : '/src/assets/images/logo-white.svg'
const logoFull = import.meta.url
  ? new URL('../../assets/images/logo.svg', import.meta.url).href
  : '/src/assets/images/logo.svg'

function getFirstMenuPath(menu: MenuVo): string | null {
  return getMenuPath(menu) || menu.children?.map(getFirstMenuPath).find((path): path is string => Boolean(path)) || null
}

function menuToRailItem(menu: MenuVo): RailItem | null {
  if (menu.status === 2 || menu.is_hidden === 1 || menu.is_hidden === true || menu.meta?.hidden === true) return null
  const to = getFirstMenuPath(menu)
  return to ? { label: getMenuLabel(menu), to, icon: menu.icon || menu.meta?.icon } : null
}

function NavigationIcon({ icon, dashboard }: { icon?: string; dashboard?: boolean }) {
  if (icon) return <MaIcon name={icon} className="size-4" />
  const Icon = dashboard ? LayoutDashboard : CircleDot
  return <Icon className="size-4" aria-hidden="true" />
}

function initials(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() || 'B'
}

function ProfileRail() {
  const t = useTranslate()
  const userInfo = useSession(state => state.userInfo)
  const logout = useSession(state => state.logout)
  const displayName = userInfo?.nickname || userInfo?.username || t('管理员')
  const email = userInfo?.email || t('未绑定邮箱')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-md outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={tx('打开 {0} 的个人菜单', { '0': displayName })}
          />
        }
      >
        <Avatar size="sm">
          {userInfo?.avatar && <AvatarImage src={userInfo.avatar} alt={displayName} />}
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{displayName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<NavLink to="/settings" />}>
          <UserRound aria-hidden="true" />
          {t('个人资料')}
        </DropdownMenuItem>
        <DropdownMenuItem render={<NavLink to="/settings/account" />}>
          <Settings aria-hidden="true" />
          {t('账号设置')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut aria-hidden="true" />
          {t('退出登录')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function VerveNavigation() {
  const t = useTranslate()
  const { state } = useSidebar()
  const location = useLocation()
  const { menus } = useShell()
  const visibleItems = menus.map(menuToRailItem).filter((item): item is RailItem => Boolean(item))
  const items = [{ label: t('首页'), to: '/dashboard', icon: undefined }, ...visibleItems].filter(
    (item, index, list) => list.findIndex(candidate => candidate.to === item.to) === index,
  )

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className="border-r-0 bg-transparent"
      style={{ top: 0, bottom: 0, height: '100svh', maxHeight: '100svh' }}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center bg-background">
        <SidebarHeader className="shrink-0 items-center px-0 py-3">
          <NavLink
            to="/dashboard"
            aria-label={t('首页')}
            className="flex size-7 items-center justify-center rounded-lg bg-primary p-1 shadow-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img src={logoMark} alt="" className="size-full object-contain" />
          </NavLink>
        </SidebarHeader>
        <SidebarContent className="min-h-0 flex-1 overflow-y-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SidebarGroup className="p-0">
            <SidebarMenu className="items-center gap-1">
              {items.map(item => {
                const active =
                  location.pathname === item.to ||
                  (item.to !== '/dashboard' && location.pathname.startsWith(`${item.to.replace(/\/$/, '')}/`))
                return (
                  <SidebarMenuItem key={item.to} className="w-8">
                    <SidebarMenuButton
                      isActive={active}
                      className="justify-center"
                      render={<NavLink to={item.to} end={item.to === '/dashboard'} />}
                    >
                      <NavigationIcon icon={item.icon} dashboard={item.to === '/dashboard'} />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="shrink-0 items-center px-0 py-3">
          <ProfileRail />
        </SidebarFooter>
      </div>
      <SidebarRail
        aria-label={state === 'expanded' ? t('折叠') : t('展开')}
        title={state === 'expanded' ? t('折叠') : t('展开')}
      />
    </Sidebar>
  )
}

function SearchMenu({ menus }: { menus: MenuVo[] }) {
  const t = useTranslate()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const items = flattenVisibleMenus(menus)
    .map(menu => ({ label: getMenuLabel(menu), to: getMenuPath(menu) }))
    .filter((item): item is { label: string; to: string } => Boolean(item.to))

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground"
      >
        <Search className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded bg-muted px-1 py-0.5 text-[10px] font-medium sm:inline">⌘K</kbd>
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
            {search.trim() && (
              <CommandList className="max-h-72 overflow-y-auto p-3">
                <CommandEmpty>{t('没有匹配的菜单')}</CommandEmpty>
                {items.map(item => (
                  <CommandItem
                    key={`verve-search-${item.to}`}
                    value={item.label}
                    onSelect={() => {
                      navigate(item.to)
                      setOpen(false)
                    }}
                  >
                    {item.label}
                  </CommandItem>
                ))}
              </CommandList>
            )}
          </Command>
        </CommandDialog>
      )}
    </>
  )
}

export function VerveHeader() {
  const t = useTranslate()
  const location = useLocation()
  const { menus } = useRoute()
  const dynamicMenu = findMenuByPath(menus, location.pathname)
  const menuTrail = findMenuTrail(menus, location.pathname)
  const title = dynamicMenu ? getMenuLabel(dynamicMenu) : t('首页')

  return (
    <header className="sticky top-0 z-50 flex h-(--header-height) w-full shrink-0 items-center gap-2 border-b border-border bg-background px-3 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <SidebarTrigger className="size-7 shrink-0 md:hidden" aria-label={t('shell.openNavigation')} />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap gap-0.5 text-sm">
            <BreadcrumbItem className="shrink-0">
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 rounded-md px-2.5 text-xs font-medium">
                <img src={logoFull} alt="BioTech" className="hidden h-3.5 w-auto sm:block" />
                <span className="size-3 rounded-full bg-primary sm:hidden" aria-hidden="true" />
                <ChevronsUpDown className="size-3.5 opacity-60" aria-hidden="true" />
              </Button>
            </BreadcrumbItem>
            {menuTrail.length > 0 ? (
              menuTrail.map((item, index) => {
                const current = index === menuTrail.length - 1
                const label = current ? title : getMenuLabel(item.menu)
                return (
                  <Fragment key={`${item.path}-${label}`}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem className="min-w-0">
                      {current ? (
                        <BreadcrumbPage className="truncate text-xs font-medium sm:text-sm">{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild className="truncate text-xs sm:text-sm">
                          <NavLink to={item.path}>{label}</NavLink>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                )
              })
            ) : (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-xs font-medium sm:text-sm">{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="hidden items-center gap-1 sm:flex">
        <Button variant="outline" size="sm" className="h-7 rounded-md px-2.5 text-xs">
          全部
        </Button>
        <SearchMenu menus={menus} />
        <HeaderActionSlot />
      </div>
    </header>
  )
}
