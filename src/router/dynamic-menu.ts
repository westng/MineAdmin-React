import type { MenuVo } from '@/modules/base/permission/menu/api/permission'

export function getMenuType(menu: MenuVo) {
  return menu.meta?.type || menu.type || 'M'
}

export function isVisibleMenu(menu: MenuVo) {
  return (
    menu.status !== 2 &&
    menu.is_hidden !== 1 &&
    menu.is_hidden !== true &&
    menu.meta?.hidden !== true &&
    getMenuType(menu) !== 'B'
  )
}

export function getMenuLabel(menu: MenuVo) {
  return menu.meta?.title || menu.name || menu.path || menu.route || menu.code || '未命名菜单'
}

export function getMenuPath(menu: MenuVo) {
  const rawPath = typeof menu.path === 'string' && menu.path.trim() ? menu.path : menu.route
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return null
  }
  const path = rawPath.trim()
  return path.startsWith('/') ? path : `/${path}`
}

const menuFilters = new Set<(menu: MenuVo) => boolean>()
export function registerMenuFilter(filter: (menu: MenuVo) => boolean) {
  menuFilters.add(filter)
  return () => {
    menuFilters.delete(filter)
  }
}
/** @deprecated Application-specific retirement rules are injected at startup. */
export function removeRetiredMenus(menus: MenuVo[]): MenuVo[] {
  return menus
    .filter(menu => [...menuFilters].every(filter => filter(menu)))
    .map(menu => (menu.children ? { ...menu, children: removeRetiredMenus(menu.children) } : menu))
}

export function flattenVisibleMenus(menus: MenuVo[]): MenuVo[] {
  return menus.flatMap(menu => (isVisibleMenu(menu) ? [menu, ...flattenVisibleMenus(menu.children || [])] : []))
}

export function findMenuByPath(menus: MenuVo[], pathname: string): MenuVo | undefined {
  const candidates = flattenVisibleMenus(menus)
    .filter(menu => {
      const path = getMenuPath(menu)
      return path && (pathname === path || pathname.startsWith(`${path}/`))
    })
    .sort((left, right) => (getMenuPath(right)?.length || 0) - (getMenuPath(left)?.length || 0))
  return candidates[0]
}

export interface MenuTrailItem {
  menu: MenuVo
  path: string
}

function resolveMenuPath(menu: MenuVo, parentPath: string): string | null {
  const rawPath = typeof menu.path === 'string' && menu.path.trim() ? menu.path : menu.route
  if (typeof rawPath !== 'string' || !rawPath.trim() || rawPath.trim() === '*') return parentPath || null

  const path = rawPath.trim()
  if (path === '/') return '/'
  if (path.startsWith('/')) return `/${path.replace(/^\/+|\/+$/g, '')}`

  const base = parentPath === '/' ? '' : parentPath.replace(/\/+$/, '')
  return `${base}/${path.replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/')
}

function matchesMenuPath(pathname: string, menuPath: string) {
  const currentPath = pathname.replace(/\/+$/, '') || '/'
  return currentPath === menuPath || currentPath.startsWith(`${menuPath}/`)
}

export function findMenuTrail(menus: MenuVo[], pathname: string): MenuTrailItem[] {
  const candidates: Array<{ trail: MenuTrailItem[]; path: string }> = []

  const visit = (items: MenuVo[], parentPath: string, ancestors: MenuTrailItem[]) => {
    items.forEach(menu => {
      const path = resolveMenuPath(menu, parentPath)
      const trail = isVisibleMenu(menu) && path ? [...ancestors, { menu, path }] : ancestors

      if (path && matchesMenuPath(pathname, path) && trail.length > 0) {
        candidates.push({ trail, path })
      }

      visit(menu.children || [], path || parentPath, trail)
    })
  }

  visit(menus, '', [])
  candidates.sort((left, right) => right.path.length - left.path.length || right.trail.length - left.trail.length)
  return candidates[0]?.trail || []
}

/** Flatten route entries while keeping every ancestor's access restrictions. */
export function flattenMenuRoutes(
  menus: MenuVo[],
  ancestors: NonNullable<MenuVo['meta']>[] = [],
): Array<{ menu: MenuVo; accessMeta: NonNullable<MenuVo['meta']>[] }> {
  return menus.flatMap(menu => {
    if (!isVisibleMenu(menu)) return []
    const accessMeta = menu.meta ? [...ancestors, menu.meta] : ancestors
    return [{ menu, accessMeta }, ...flattenMenuRoutes(menu.children || [], accessMeta)]
  })
}
