import type { MenuVo } from '@/modules/base/permission/menu/api/permission'

export function getMenuType(menu: MenuVo) {
  return menu.meta?.type || menu.type || 'M'
}

export function isVisibleMenu(menu: MenuVo) {
  return menu.status !== 2
    && menu.is_hidden !== 1
    && menu.is_hidden !== true
    && menu.meta?.hidden !== true
    && getMenuType(menu) !== 'B'
}

export function getMenuLabel(menu: MenuVo) {
  return menu.meta?.title || menu.name || menu.path || menu.route || menu.code || '未命名菜单'
}

export function getMenuPath(menu: MenuVo) {
  const rawPath = typeof menu.path === 'string' && menu.path.trim()
    ? menu.path
    : menu.route
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    return null
  }
  const path = rawPath.trim()
  return path.startsWith('/') ? path : `/${path}`
}

const retiredMenuPaths = new Set(['/marketing/calendar', '/live', '/yuntu', '/comp', '/helper'])

function isRetiredMenu(menu: MenuVo) {
  const path = getMenuPath(menu)?.replace(/\/+$/, '') || ''
  return retiredMenuPaths.has(path)
    || path.startsWith('/helper/')
    || /^helper(?::|\/|$)/.test(menu.name || '')
    || /^(?:modules\/)?helper\//.test(menu.component || '')
}

// Apply to cached and fetched menus so retired entries cannot reappear from stale client data.
export function removeRetiredMenus(menus: MenuVo[]): MenuVo[] {
  return menus
    .filter(menu => !isRetiredMenu(menu))
    .map(menu => menu.children ? { ...menu, children: removeRetiredMenus(menu.children) } : menu)
}

export function flattenVisibleMenus(menus: MenuVo[]): MenuVo[] {
  return menus.flatMap(menu => isVisibleMenu(menu) ? [menu, ...flattenVisibleMenus(menu.children || [])] : [])
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
