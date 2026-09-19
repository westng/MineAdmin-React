import { createTextTranslator, useLocaleRevision } from '@/provider/i18n'
import { useShell } from '@/hooks/shell/use-shell'
import * as React from 'react'
import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  CircleDot,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Moon,
  Palette,
  Search,
  Settings,
  Sun,
  Monitor,
  UserRound,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { MaIcon } from '@/components/ma-icon'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/reui/primitives/avatar'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { useSession } from '@/hooks/framework/use-session'
import { useSettingStore } from '@/provider/settings'
import { getMenuLabel, getMenuPath, isVisibleMenu } from '@/router/dynamic-menu'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'
import { cn } from '@/utils/cn'
import { ThemeColorPicker } from '@/components/reui/theme-color-picker'
import { themeColors } from '@/provider/settings/colors'

const tx = createTextTranslator('shell.ui')

type NavigationIcon = ComponentType<{ className?: string }> | string
type MenuItem = { label: string; to: string; icon?: NavigationIcon; children?: MenuItem[]; end?: boolean }

const fallbackStoreItems: MenuItem[] = []
const fallbackSystemItems: MenuItem[] = [
  {
    get label() {
      return tx('个人资料')
    },
    to: '/settings',
    icon: UserRound,
    end: true,
  },
  {
    get label() {
      return tx('账号设置')
    },
    to: '/settings/account',
    icon: Settings,
  },
]
const workspaceItems: MenuItem[] = [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }]

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
function initials(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() || 'M'
}
function ProfileAvatar({ name, avatar, size = 'sm' }: { name: string; avatar?: string; size?: 'sm' | 'default' }) {
  return (
    <Avatar size={size}>
      {avatar && <AvatarImage src={avatar} alt={name} />}
      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function NavigationSearchMenu({ items }: { items: MenuItem[] }) {
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

const themeOptions = [
  {
    value: 'light' as const,
    get label() {
      return tx('浅色')
    },
    icon: Sun,
  },
  {
    value: 'dark' as const,
    get label() {
      return tx('深色')
    },
    icon: Moon,
  },
  {
    value: 'autoMode' as const,
    get label() {
      return tx('跟随系统')
    },
    icon: Monitor,
  },
]
function ThemeSwitcher({
  value,
  onChange,
}: {
  value: 'light' | 'dark' | 'autoMode'
  onChange: (value: 'light' | 'dark' | 'autoMode') => void
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <div
      role="radiogroup"
      aria-label={tx('主题')}
      className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5"
    >
      {themeOptions.map(({ value: optionValue, label, icon: Icon }, index) => (
        <Button
          key={optionValue}
          type="button"
          role="radio"
          aria-checked={value === optionValue}
          tabIndex={value === optionValue ? 0 : -1}
          onKeyDown={event => {
            const delta = ['ArrowRight', 'ArrowDown'].includes(event.key)
              ? 1
              : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                ? -1
                : 0
            if (!delta) return
            event.preventDefault()
            const next = (index + delta + themeOptions.length) % themeOptions.length
            onChange(themeOptions[next].value)
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
          }}
          aria-label={label}
          variant="ghost"
          size="icon-xs"
          onClick={() => onChange(optionValue)}
          className={cn(
            'rounded-full',
            value === optionValue
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon aria-hidden="true" />
        </Button>
      ))}
    </div>
  )
}
function ProfileMenu({
  displayName,
  email,
  avatar,
  colorMode,
  primaryColor,
  onChangeTheme,
  onChangeColor,
  onLogout,
}: {
  displayName: string
  email: string
  avatar?: string
  colorMode: 'light' | 'dark' | 'autoMode'
  primaryColor: string
  onChangeTheme: (value: 'light' | 'dark' | 'autoMode') => void
  onChangeColor: (value: string) => void
  onLogout: () => void
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-12 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={tx('打开 {0} 的个人菜单', { '0': displayName })}
          />
        }
      >
        <ProfileAvatar name={displayName} avatar={avatar} />
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-medium">{displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        </span>
        <ChevronsUpDown
          className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
            <ProfileAvatar name={displayName} avatar={avatar} size="default" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">{displayName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<NavLink to="/settings" />}>
          <UserRound aria-hidden="true" />
          {tx('个人资料')}
        </DropdownMenuItem>
        <DropdownMenuItem render={<NavLink to="/settings/account" />}>
          <Settings aria-hidden="true" />
          {tx('账号设置')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={event => event.preventDefault()} className="cursor-default focus:bg-transparent!">
          <Palette aria-hidden="true" />
          <span>{tx('主题')}</span>
          <div className="ml-auto">
            <ThemeSwitcher value={colorMode} onChange={onChangeTheme} />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={event => event.preventDefault()} className="cursor-default focus:bg-transparent!">
          <Palette aria-hidden="true" />
          <span>{tx('配色')}</span>
          <div className="ml-auto">
            <ThemeColorPicker
              colors={themeColors}
              value={primaryColor}
              onChange={onChangeColor}
              compact
              className="gap-1"
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut aria-hidden="true" />
          {tx('退出登录')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MenuTree({
  items,
  pathname,
  expanded,
  onToggle,
}: {
  items: MenuItem[]
  pathname: string
  expanded: Set<string>
  onToggle: (path: string, open: boolean) => void
}) {
  const localeRevision = useLocaleRevision()
  void localeRevision

  function renderItems(levelItems: MenuItem[], nested: boolean): React.ReactNode {
    return levelItems.map(item => {
      const hasChildren = Boolean(item.children?.length)
      const isActive = pathname === item.to || (!item.end && pathname.startsWith(`${item.to}/`))
      const leaf = (
        <>
          {<NavigationIconView icon={item.icon} />}
          <span>{item.label}</span>
        </>
      )
      if (!hasChildren) {
        return nested ? (
          <SidebarMenuSubItem key={item.to}>
            <SidebarMenuSubButton isActive={isActive} render={<NavLink to={item.to} end={item.end} />}>
              {leaf}
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ) : (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={item.label}
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
          <SidebarMenuButton isActive={isActive} tooltip={item.label}>
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
          <SidebarMenuSub>{renderItems(item.children ?? [], true)}</SidebarMenuSub>
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
  const localeRevision = useLocaleRevision()
  void localeRevision

  const location = useLocation()
  const { menus: storedMenus } = useShell()
  const menus = menusOverride ?? storedMenus
  const userInfo = useSession(state => state.userInfo)
  const logout = useSession(state => state.logout)
  const { settings, setColorMode, setPrimaryColor } = useSettingStore()
  const { state, isMobile } = useSidebar()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const menuItems = React.useMemo(() => {
    void localeRevision // Rebuild translated configuration when the active locale changes.
    return menus.map(toMenuItem).filter((item): item is MenuItem => Boolean(item))
  }, [menus, localeRevision])
  const storeItems = React.useMemo(
    () => (menuItems.length > 0 ? menuItems : fallbackStoreItems).filter(item => item.to !== '/dashboard'),
    [menuItems],
  )
  const systemItems = fallbackSystemItems
  const allItems = React.useMemo(() => [...workspaceItems, ...storeItems, ...systemItems], [storeItems, systemItems])
  const displayName = userInfo?.nickname || userInfo?.username || tx('管理员')
  const email = userInfo?.email || userInfo?.username || tx('未绑定邮箱')
  React.useEffect(() => {
    const active = allItems
      .filter(item =>
        item.children?.some(child => location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)),
      )
      .map(item => item.to)
    if (!active.length) return
    const timer = window.setTimeout(() => setExpanded(previous => new Set([...previous, ...active])), 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname, allItems])
  const onToggle = React.useCallback(
    (path: string, open: boolean) =>
      setExpanded(previous => {
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
              <MenuTree items={storeItems} pathname={location.pathname} expanded={expanded} onToggle={onToggle} />
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
          <ProfileMenu
            displayName={displayName}
            email={email}
            avatar={userInfo?.avatar || undefined}
            colorMode={settings.app.colorMode}
            primaryColor={settings.app.primaryColor}
            onChangeTheme={setColorMode}
            onChangeColor={setPrimaryColor}
            onLogout={() => void logout()}
          />
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
