import { useTextTranslator } from '@/hooks/i18n/use-translator'
import { useLocaleRevision } from '@/hooks/i18n/use-i18n-state'
import { useShell } from '@/layouts/hooks/use-shell'
import { useSettingStore } from '@/store/settings/use-settings'
import * as React from 'react'
import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, CircleDot, LayoutDashboard, Search, Settings, UserRound } from 'lucide-react'
import type { ComponentType } from 'react'
import { MaIcon } from '@/components/ma-icon'
import { Button } from '@/components/reui/primitives/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/reui/primitives/collapsible'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/reui/primitives/command'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/reui/primitives/sidebar'
import { getMenuLabel, getMenuPath, isVisibleMenu } from '@/router/navigation/menu'
import type { MenuVo } from '@/services/navigation/types'
import { cn } from '@/utils/cn'
import { ProfileMenu } from '@/layouts/components/profile-menu'

type NavigationIcon = ComponentType<{ className?: string }> | string
type MenuItem = { label: string; to: string; icon?: NavigationIcon; children?: MenuItem[]; end?: boolean }

const fallbackStoreItems: MenuItem[] = []

function getActiveParentPaths(items: MenuItem[], pathname: string): string[] {
  return items.flatMap(item => {
    if (!item.children?.length) return []
    const ancestors = getActiveParentPaths(item.children, pathname)
    const hasActiveChild = item.children.some(
      child => pathname === child.to || (!child.end && pathname.startsWith(`${child.to}/`)),
    )
    return hasActiveChild || ancestors.length ? [item.to, ...ancestors] : []
  })
}

function getMenuIcon(icon?: string): NavigationIcon {
  return icon?.trim() || CircleDot
}
function NavigationIconView({ icon, className }: { icon?: NavigationIcon; className?: string }) {
  if (typeof icon === 'string') return <MaIcon name={icon} className={cn('size-4', className)} />
  const IconComponent = icon || CircleDot
  return <IconComponent className={className} aria-hidden="true" />
}
function toMenuItem(menu: MenuVo): MenuItem | null {
  if (!isVisibleMenu(menu)) return null
  const to = getMenuPath(menu)
  if (!to) return null
  const children = (menu.children ?? []).map(toMenuItem).filter((item): item is MenuItem => Boolean(item))
  return {
    label: getMenuLabel(menu),
    to,
    icon: getMenuIcon(menu.icon || menu.meta?.icon),
    ...(children.length > 0 ? { children } : {}),
  }
}
function NavigationSearchMenu({ items }: { items: MenuItem[] }) {
  const tx = useTextTranslator('shell.ui')

  const localeRevision = useLocaleRevision()
  void localeRevision

  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const flatItems = items.flatMap(function flatten(item): MenuItem[] {
    return [item, ...(item.children ?? []).flatMap(flatten)]
  })
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label={tx('搜索菜单')}
        className="size-8 shrink-0 group-data-[collapsible=icon]:flex hidden"
      >
        <Search className="size-4" aria-hidden="true" />
      </Button>
      <button
        id="search"
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tx('搜索菜单')}
        className="flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring dark:border-input dark:bg-input/30 dark:hover:bg-input/50 group-data-[collapsible=icon]:hidden"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">Search...</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={nextOpen => {
          setOpen(nextOpen)
          if (!nextOpen) setSearch('')
        }}
        title={tx('搜索菜单')}
        description={tx('搜索并打开菜单页面')}
        className="h-auto min-h-12 max-h-[min(32rem,calc(100vh-2rem))] w-[min(32rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-xl border p-0"
      >
        <Command className="h-auto max-h-[min(32rem,calc(100vh-2rem))] rounded-xl bg-background">
          <CommandInput
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={tx('搜索菜单')}
            aria-label={tx('搜索菜单')}
          />
          {search.trim() && (
            <CommandList className="max-h-72 overflow-y-auto p-3">
              <CommandEmpty>{tx('没有匹配的菜单')}</CommandEmpty>
              {flatItems.map(item => (
                <CommandItem
                  key={`search-${item.to}`}
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
    </>
  )
}

function MenuTree({
  items,
  pathname,
  expanded,
  onToggle,
  showRootIcons = true,
}: {
  items: MenuItem[]
  pathname: string
  expanded: Set<string>
  onToggle: (path: string, open: boolean) => void
  showRootIcons?: boolean
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  function renderItems(levelItems: MenuItem[], nested: boolean): React.ReactNode {
    return levelItems.map(item => {
      const hasChildren = Boolean(item.children?.length)
      const isActive = pathname === item.to || (!item.end && pathname.startsWith(`${item.to}/`))
      const leaf = (
        <>
          {showRootIcons && !nested && <NavigationIconView icon={item.icon} />}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </>
      )
      if (!hasChildren) {
        return nested ? (
          <SidebarMenuSubItem key={item.to}>
            <SidebarMenuSubButton
              isActive={isActive}
              title={item.label}
              render={<NavLink to={item.to} end={item.end} />}
            >
              {leaf}
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ) : (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={item.label}
              title={item.label}
              render={<NavLink to={item.to} end={item.end} />}
            >
              {leaf}
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      }
      const isOpen = expanded.has(item.to)
      const trigger = (
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive} tooltip={item.label} title={item.label}>
            {leaf}
            <ChevronRight
              className={cn(
                'ml-auto size-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden',
                isOpen && 'rotate-90',
              )}
              aria-hidden="true"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
      )
      const content = (
        <CollapsibleContent>
          {/* 保留原生左缩进和引导线，避免右侧留白随层级累积。 */}
          <SidebarMenuSub className="mr-0 pr-0">{renderItems(item.children ?? [], true)}</SidebarMenuSub>
        </CollapsibleContent>
      )
      return nested ? (
        <SidebarMenuSubItem key={item.to}>
          <Collapsible open={isOpen} onOpenChange={open => onToggle(item.to, open)}>
            {trigger}
            {content}
          </Collapsible>
        </SidebarMenuSubItem>
      ) : (
        <Collapsible key={item.to} open={isOpen} onOpenChange={open => onToggle(item.to, open)}>
          <SidebarMenuItem>
            {trigger}
            {content}
          </SidebarMenuItem>
        </Collapsible>
      )
    })
  }
  return <SidebarMenu className="gap-px">{renderItems(items, false)}</SidebarMenu>
}

export default function MainAside({
  menusOverride,
  sidebarOffset,
}: {
  menusOverride?: MenuVo[]
  sidebarOffset?: string
}) {
  const tx = useTextTranslator('shell.ui')
  const systemItems = React.useMemo<MenuItem[]>(
    () => [
      {
        label: tx('个人资料'),
        to: '/uc/index',
        icon: UserRound,
        end: true,
      },
      {
        label: tx('账号设置'),
        to: '/uc/account',
        icon: Settings,
      },
    ],
    [tx],
  )

  const localeRevision = useLocaleRevision()
  void localeRevision

  const dashboardPage = useSettingStore(state => state.settings.dashboardPage)
  const workspaceItems = React.useMemo<MenuItem[]>(
    () => [{ label: dashboardPage.title, to: dashboardPage.path, icon: dashboardPage.icon || LayoutDashboard }],
    [dashboardPage],
  )
  const location = useLocation()
  const { menus: storedMenus } = useShell()
  const menus = menusOverride ?? storedMenus
  const { state, isMobile } = useSidebar()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const menuItems = React.useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return menus.map(toMenuItem).filter((item): item is MenuItem => Boolean(item))
  }, [menus, localeRevision])
  const storeItems = React.useMemo(
    () => (menuItems.length > 0 ? menuItems : fallbackStoreItems).filter(item => item.to !== dashboardPage.path),
    [menuItems, dashboardPage.path],
  )
  const allItems = React.useMemo(
    () => [...workspaceItems, ...storeItems, ...systemItems],
    [workspaceItems, storeItems, systemItems],
  )
  // 菜单对象重建不应覆盖手动折叠；自动展开只跟随路由及其祖先路径变化。
  const activeParentPaths = JSON.stringify(getActiveParentPaths(allItems, location.pathname))
  React.useEffect(() => {
    const active = JSON.parse(activeParentPaths) as string[]
    if (!active.length) return
    const timer = window.setTimeout(
      () =>
        setExpanded(previous =>
          active.every(path => previous.has(path)) ? previous : new Set([...previous, ...active]),
        ),
      0,
    )
    return () => window.clearTimeout(timer)
  }, [location.pathname, activeParentPaths])
  const onToggle = React.useCallback(
    (path: string, open: boolean) =>
      setExpanded(previous => {
        if (previous.has(path) === open) return previous
        const next = new Set(previous)
        if (open) next.add(path)
        else next.delete(path)
        return next
      }),
    [],
  )
  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="flex flex-col border-r border-sidebar-border bg-background"
      style={{
        top: 'var(--shell-header-height, var(--header-height))',
        bottom: 'auto',
        height: 'calc(100svh - var(--shell-header-height, var(--header-height)))',
        maxHeight: 'calc(100svh - var(--shell-header-height, var(--header-height)))',
        overflow: 'hidden',
        ...(sidebarOffset ? { left: sidebarOffset } : {}),
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-background [--sidebar-accent:color-mix(in_oklab,var(--foreground)_5%,transparent)] [--sidebar-accent-foreground:var(--foreground)]">
        <SidebarHeader className="shrink-0 px-4 py-2 group-data-[collapsible=icon]:px-3.5">
          <SidebarGroup className="mt-2 p-0">
            <NavigationSearchMenu items={allItems} />
          </SidebarGroup>
        </SidebarHeader>
        <SidebarContent className="min-h-0 flex-1 gap-2 overflow-y-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden group-data-[collapsible=icon]:px-1.5">
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              {tx('工作台')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <MenuTree items={workspaceItems} pathname={location.pathname} expanded={expanded} onToggle={onToggle} />
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              {tx('导航')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <MenuTree
                items={storeItems}
                pathname={location.pathname}
                expanded={expanded}
                onToggle={onToggle}
                showRootIcons={menusOverride === undefined}
              />
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              {tx('系统')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <MenuTree items={systemItems} pathname={location.pathname} expanded={expanded} onToggle={onToggle} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="mt-2 shrink-0 gap-2 px-4 py-2 group-data-[collapsible=icon]:px-1.5">
          <ProfileMenu />
        </SidebarFooter>
        {!isMobile && (
          <SidebarRail
            aria-label={state === 'expanded' ? tx('折叠') : tx('展开')}
            title={state === 'expanded' ? tx('折叠') : tx('展开')}
          />
        )}
      </div>
    </Sidebar>
  )
}
