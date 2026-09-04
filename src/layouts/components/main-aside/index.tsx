import { Bell, BriefcaseBusiness, ChevronRight, CircleDot, LayoutDashboard, LogOut, Monitor, Moon, Palette, Search, Settings, Sun, UserRound } from 'lucide-react'
import { Icon as Iconify } from '@iconify/react'
import * as React from 'react'
import type { ComponentType } from 'react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUserStore } from '@/store/modules/useUserStore'
import { useSettingStore } from '@/provider/settings'
import { useMenuStore } from '@/store/modules/useMenuStore'
import { flattenVisibleMenus, getMenuLabel, getMenuPath, isVisibleMenu } from '@/router/dynamic-menu'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'
import { cn } from '@/lib/utils'
import { customSectionPanes } from './section-pane-registry'

type SectionId = string

type RailItem = {
  label: string
  to: string
  icon: NavigationIcon
  section: SectionId
}

type MenuItem = {
  label: string
  to: string
  icon?: NavigationIcon
  children?: MenuItem[]
}

type NavigationIcon = ComponentType<{ className?: string }> | string

const railItems: RailItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, section: 'dashboard' },
]

const sectionItems: Record<string, MenuItem[]> = {
  dashboard: [],
  settings: [
    { label: '我的资料', to: '/settings', icon: UserRound },
    { label: '账号设置', to: '/settings/account', icon: Settings },
  ],
}

const sectionTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: '配置',
}

function getMenuIcon(icon?: string): NavigationIcon {
  return icon?.trim() || CircleDot
}

function NavigationIconView({ icon, className }: { icon?: NavigationIcon; className?: string }) {
  if (typeof icon === 'string') {
    return <Iconify icon={icon} className={className} aria-hidden="true" />
  }

  const IconComponent = icon || CircleDot
  return <IconComponent className={className} aria-hidden="true" />
}

function getDynamicRailItems(menus: MenuVo[]): RailItem[] {
  const items: Array<RailItem | null> = []

  for (const menu of menus) {
    if (!isVisibleMenu(menu)) continue

    const hasChildren = menu.children && menu.children.length > 0
    const isLayoutContainer = menu.component === 'Layout'

    // 如果是目录容器（Layout），显示它的子菜单
    if (isLayoutContainer && hasChildren) {
      const parentPath = getMenuPath(menu)
      for (const child of menu.children ?? []) {
        if (!isVisibleMenu(child)) continue
        const childPath = getMenuPath(child)
        if (childPath) {
          items.push({
            label: getMenuLabel(child),
            to: childPath,
            icon: getMenuIcon(child.icon || child.meta?.icon),
            section: parentPath ? `dynamic:${parentPath}` : `dynamic:${childPath}`,
          })
        }
      }
    }
    // 否则显示菜单本身
    else {
      const path = getMenuPath(menu)
      if (path) {
        items.push({
          label: getMenuLabel(menu),
          to: path,
          icon: getMenuIcon(menu.icon || menu.meta?.icon),
          section: `dynamic:${path}`,
        })
      }
    }
  }

  return items.filter((item): item is RailItem => item !== null)
}

function getSection(pathname: string, menus: MenuVo[]): SectionId {
  // 系统静态路由优先于动态菜单匹配
  if (pathname === '/dashboard') return 'dashboard'
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return 'settings'

  // 查找所有可见菜单（包括子菜单）
  const allMenus = flattenVisibleMenus(menus)

  // 先尝试精确匹配当前路径
  const exactMatch = allMenus.find(menu => {
    const path = getMenuPath(menu)
    return path === pathname
  })

  if (exactMatch) {
    // 如果匹配到子菜单，返回其父菜单的 section
    const parent = menus.find(m => m.children?.some(child => child.id === exactMatch.id))
    if (parent) {
      const parentPath = getMenuPath(parent)
      return parentPath ? `dynamic:${parentPath}` : 'dashboard'
    }
    // 如果是顶级菜单，返回自己的 section
    const path = getMenuPath(exactMatch)
    return path ? `dynamic:${path}` : 'dashboard'
  }

  // 如果没有精确匹配，尝试前缀匹配（处理嵌套路由）
  const dynamicMenu = allMenus
    .filter(menu => {
      const path = getMenuPath(menu)
      return path && pathname.startsWith(`${path}/`)
    })
    .sort((left, right) => (getMenuPath(right)?.length || 0) - (getMenuPath(left)?.length || 0))[0]

  if (dynamicMenu) {
    // 检查是否是子菜单
    const parent = menus.find(m => m.children?.some(child => child.id === dynamicMenu.id))
    if (parent) {
      const parentPath = getMenuPath(parent)
      return parentPath ? `dynamic:${parentPath}` : 'dashboard'
    }
    const path = getMenuPath(dynamicMenu)
    if (path) return `dynamic:${path}`
  }

  return 'dashboard'
}

function normalizeRoutePath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

function getDynamicSectionItems(section: SectionId, menus: MenuVo[]): MenuItem[] {
  if (!section.startsWith('dynamic:')) return []
  const path = section.slice('dynamic:'.length)

  // 首先尝试在顶级菜单中查找
  let menu = menus.find(item => getMenuPath(item) === path)

  // 如果顶级没找到，可能是在子菜单中，需要递归查找父菜单
  if (!menu) {
    for (const topMenu of menus) {
      const childMenu = (topMenu.children || []).find(child => getMenuPath(child) === path)
      if (childMenu) {
        menu = topMenu
        break
      }
    }
  }

  return (menu?.children ?? [])
    .filter(isVisibleMenu)
    .map(item => {
      const itemPath = getMenuPath(item)
      if (!itemPath) return null

      const children = (item.children ?? [])
        .filter(isVisibleMenu)
        .map(child => {
          const childPath = getMenuPath(child)
          return childPath ? { label: getMenuLabel(child), to: childPath, icon: getMenuIcon(child.icon || child.meta?.icon) } : null
        })
        .filter((child): child is NonNullable<typeof child> => child !== null)

      return {
        label: getMenuLabel(item),
        to: itemPath,
        icon: getMenuIcon(item.icon || item.meta?.icon),
        ...(children.length > 0 ? { children } : {}),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

function initials(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() || 'M'
}

function RailTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function ProfileAvatar({ name, avatar, size = 'sm' }: { name: string; avatar?: string; size?: 'sm' | 'default' }) {
  return (
    <Avatar size={size}>
      {avatar && <AvatarImage src={avatar} alt={name} />}
      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

const themeOptions = [
  { value: 'light' as const, label: '浅色', icon: Sun },
  { value: 'dark' as const, label: '深色', icon: Moon },
  { value: 'autoMode' as const, label: '跟随系统', icon: Monitor },
]

function ThemeSwitcher({
  value,
  onChange,
}: {
  value: 'light' | 'dark' | 'autoMode'
  onChange: (value: 'light' | 'dark' | 'autoMode') => void
}) {
  return (
    <div role="radiogroup" aria-label="主题" className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5">
      {themeOptions.map(({ value: optionValue, label, icon: Icon }) => {
        const isActive = value === optionValue
        return (
          <Button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              onChange(optionValue)
            }}
            className={cn('rounded-full', isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <Icon aria-hidden="true" />
          </Button>
        )
      })}
    </div>
  )
}

function ProfileMenu({
  displayName,
  email,
  avatar,
  colorMode,
  onChangeTheme,
  onLogout,
}: {
  displayName: string
  email: string
  avatar?: string
  colorMode: 'light' | 'dark' | 'autoMode'
  onChangeTheme: (value: 'light' | 'dark' | 'autoMode') => void
  onLogout: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        openOnHover
        delay={0}
        closeDelay={180}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="mx-auto p-0!"
            aria-label={`Open profile for ${displayName}`}
          >
            <ProfileAvatar name={displayName} avatar={avatar} />
          </Button>
        }
      />
      <DropdownMenuContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
            <ProfileAvatar name={displayName} avatar={avatar} size="default" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<NavLink to="/settings" />}>
            <UserRound aria-hidden="true" />
            个人资料
          </DropdownMenuItem>
          <DropdownMenuItem render={<NavLink to="/settings/account" />}>
            <Settings aria-hidden="true" />
            账号设置
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={event => event.preventDefault()} className="cursor-default focus:bg-transparent!">
          <Palette aria-hidden="true" />
          <span>主题</span>
          <div className="ml-auto">
            <ThemeSwitcher value={colorMode} onChange={onChangeTheme} />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut aria-hidden="true" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function MainAside() {
  const location = useLocation()
  const menus = useMenuStore(state => state.menus)
  const userInfo = useUserStore(state => state.userInfo)
  const logout = useUserStore(state => state.logout)
  const { settings, setColorMode } = useSettingStore()
  const { state: sidebarState } = useSidebar()
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const section = getSection(location.pathname, menus)
  const dynamicRailItems = getDynamicRailItems(menus)
  const navigationItems = [...railItems, ...dynamicRailItems.filter(item => !railItems.some(staticItem => staticItem.to === item.to))]
  const navigationSectionItems = sectionItems[section] || getDynamicSectionItems(section, menus)

  // Auto-expand parent menus when navigating to a child route
  React.useEffect(() => {
    navigationSectionItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => location.pathname === child.to)
        if (hasActiveChild && !expandedMenus.has(item.to)) {
          setExpandedMenus(prev => new Set(prev).add(item.to))
        }
      }
    })
  }, [expandedMenus, location.pathname, navigationSectionItems])

  // 获取标题：优先使用静态标题，否则从动态菜单中获取
  let navigationTitle = sectionTitles[section]
  if (!navigationTitle && section.startsWith('dynamic:')) {
    const sectionPath = section.slice('dynamic:'.length)
    const menu = menus.find(m => getMenuPath(m) === sectionPath)
    navigationTitle = menu ? getMenuLabel(menu) : sectionPath.split('/').pop() || '菜单'
  }

  // 查找自定义面板
  const currentPath = normalizeRoutePath(location.pathname)
  const customPane = customSectionPanes.find(pane => pane.path && normalizeRoutePath(pane.path) === currentPath)
    ?? customSectionPanes.find(pane => pane.section === section && !pane.path)

  const displayName = userInfo?.nickname || userInfo?.username || '管理员'
  const email = userInfo?.email || userInfo?.username || '未绑定邮箱'
  const avatar = userInfo?.avatar || undefined

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
      <div className="flex min-h-full flex-1">
        <Sidebar collapsible="none" className="w-(--sidebar-width-icon)! border-r">
          <SidebarHeader className="flex items-center justify-center py-3">
            <RailTooltip label="ReUI Clinic">
              <SidebarMenuButton
                size="lg"
                className="size-8! justify-center gap-0 p-0!"
                render={<NavLink to="/dashboard" />}
                aria-label="ReUI Clinic"
              >
                <div className="grid size-7 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <BriefcaseBusiness className="size-4" aria-hidden="true" />
                </div>
              </SidebarMenuButton>
            </RailTooltip>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup className="p-2">
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {navigationItems.map(({ label, to, icon, section: itemSection }) => (
                    <SidebarMenuItem key={to}>
                      <RailTooltip label={label}>
                        <SidebarMenuButton
                          isActive={section === itemSection}
                          className="size-8! justify-center gap-0 p-2! [&>span]:hidden"
                          render={<NavLink to={to} />}
                          aria-label={label}
                        >
                          <NavigationIconView icon={icon} />
                        </SidebarMenuButton>
                      </RailTooltip>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto p-2">
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  <SidebarMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <SidebarMenuButton className="size-8! justify-center gap-0 p-2! [&>span]:hidden" tooltip={{ children: '通知', hidden: false }} aria-label="通知">
                            <Bell />
                          </SidebarMenuButton>
                        }
                      />
                      <DropdownMenuContent side="right" align="end" className="w-64">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>通知</DropdownMenuLabel>
                          <DropdownMenuItem disabled>暂无新通知</DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <SidebarMenuButton className="size-8! justify-center gap-0 p-2! [&>span]:hidden" tooltip={{ children: '搜索', hidden: false }} aria-label="搜索">
                            <Search />
                          </SidebarMenuButton>
                        }
                      />
                      <DropdownMenuContent side="right" align="end" className="w-56">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>搜索</DropdownMenuLabel>
                          {navigationItems.map(item => (
                            <DropdownMenuItem key={`search-${item.to}`} render={<NavLink to={item.to} />}>
                              {item.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <RailTooltip label="Settings">
                      <SidebarMenuButton
                        isActive={section === 'settings'}
                        className="size-8! justify-center gap-0 p-2! [&>span]:hidden"
                        render={<NavLink to="/settings" />}
                        aria-label="Settings"
                      >
                        <Settings />
                      </SidebarMenuButton>
                    </RailTooltip>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-2">
            <ProfileMenu
              displayName={displayName}
              email={email}
              avatar={avatar}
              colorMode={settings.app.colorMode}
              onChangeTheme={setColorMode}
              onLogout={() => void logout()}
            />
          </SidebarFooter>
        </Sidebar>

        <Sidebar
          collapsible="none"
          className={cn(
            'relative flex-1 overflow-hidden transition-[width] duration-200 ease-linear',
            sidebarState === 'collapsed' ? 'w-0' : 'w-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]',
          )}
        >
          {customPane ? <customPane.component /> : (
            <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
              <div className="flex h-(--header-height) shrink-0 items-center justify-between border-b border-border px-3">
                <span className="text-sm font-semibold text-foreground">{navigationTitle}</span>
              </div>
              <SidebarContent>
                <SidebarGroup className="p-2">
                  <SidebarGroupContent>
                    {navigationSectionItems.length > 0 ? (
                      <SidebarMenu>
                        {navigationSectionItems.map((item, index) => {
                          const hasChildren = item.children && item.children.length > 0
                          const isExpanded = expandedMenus.has(item.to)
                          const isParentActive = location.pathname.startsWith(item.to)
                          const itemIcon = item.icon

                          if (hasChildren) {
                            return (
                              <Collapsible
                                key={`${section}-${item.label}`}
                                open={isExpanded}
                                onOpenChange={open => {
                                  setExpandedMenus(previous => {
                                    const next = new Set(previous)
                                    if (open) {
                                      next.add(item.to)
                                    } else {
                                      next.delete(item.to)
                                    }
                                    return next
                                  })
                                }}
                              >
                                <SidebarMenuItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuButton isActive={isParentActive}>
                                      {itemIcon && <NavigationIconView icon={itemIcon} />}
                                      <span>{item.label}</span>
                                      <ChevronRight className={`ml-auto size-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                    </SidebarMenuButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub>
                                      {(item.children ?? []).map(child => (
                                        <SidebarMenuSubItem key={child.to}>
                                          <SidebarMenuSubButton isActive={location.pathname === child.to} render={<NavLink to={child.to} />}>
                                            {child.icon && <NavigationIconView icon={child.icon} />}
                                            <span>{child.label}</span>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      ))}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuItem>
                              </Collapsible>
                            )
                          }

                          return (
                            <SidebarMenuItem key={`${section}-${item.label}`}>
                              <SidebarMenuButton isActive={location.pathname === item.to || (section !== 'settings' && index === 0 && location.pathname.startsWith(`${item.to}/`))} render={<NavLink to={item.to} />}>
                                {itemIcon && <NavigationIconView icon={itemIcon} />}
                                <span>{item.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        })}
                      </SidebarMenu>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                        <CircleDot className="size-8 text-muted-foreground/40" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">暂无子菜单</p>
                      </div>
                    )}
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </div>
          )}
        </Sidebar>
      </div>
    </Sidebar>
  )
}

export function SidebarCollapseRail() {
  const { state, toggleSidebar, isMobile } = useSidebar()

  if (isMobile) return null

  const isExpanded = state === 'expanded'

  return (
    <RailTooltip label={isExpanded ? '折叠侧边栏' : '展开侧边栏'}>
      <button
        type="button"
        aria-label={isExpanded ? '折叠侧边栏' : '展开侧边栏'}
        onClick={toggleSidebar}
        style={{ left: isExpanded ? 'var(--sidebar-width)' : 'var(--sidebar-width-icon)' }}
        className="fixed top-1/2 z-30 flex h-12 w-7 -translate-y-1/2 cursor-pointer items-center pl-2 outline-hidden transition-[left] duration-200 ease-linear focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <span className="flex flex-col items-center" aria-hidden="true">
          <span className={cn('block h-2 w-0.5 origin-bottom rounded-t-full bg-foreground/40 transition-transform duration-150', isExpanded ? 'rotate-40' : '-rotate-40')} />
          <span className={cn('block h-2 w-0.5 origin-top rounded-b-full bg-foreground/40 transition-transform duration-150', isExpanded ? '-rotate-40' : 'rotate-40')} />
        </span>
      </button>
    </RailTooltip>
  )
}
