import { matchPath, matchRoutes } from 'react-router-dom'
import type { MenuVo } from '@/services/navigation/types'

export const getMenuType = (menu: MenuVo) => menu.meta?.type || menu.type || 'M'
export const isEnabledMenu = (menu: MenuVo) => menu.status !== 2 && getMenuType(menu) !== 'B'
export const isVisibleMenu = (menu: MenuVo) =>
  isEnabledMenu(menu) && menu.is_hidden !== 1 && menu.is_hidden !== true && menu.meta?.hidden !== true
export const getMenuLabel = (menu: MenuVo) =>
  menu.meta?.title || menu.name || menu.path || menu.route || menu.code || '未命名菜单'

/** 菜单 URL；视图地址不参与 URL 拼接。 */
export function getMenuPath(menu: MenuVo, parent = ''): string | null {
  const raw = (menu.path?.trim() || menu.route?.trim()) ?? ''
  const type = getMenuType(menu)
  if (['I', 'L'].includes(type) && (!raw || /^[a-z][\w+.-]*:|^\/\//i.test(raw))) {
    const name = menu.name || menu.id
    return name ? `/${type === 'I' ? 'MineIframe' : 'MineLink'}/${encodeURIComponent(name)}` : null
  }
  if (!raw) return parent && (menu.component || menu.redirect) ? parent : null
  if (raw === '*') return parent || null
  if (/^[a-z][\w+.-]*:|^\/\/|[\\#]/i.test(raw) || raw.split('/').includes('..')) return null
  const segments = raw.split('/').filter(Boolean)
  if (
    segments.some(
      (segment, i) =>
        (segment.includes('?') && !/^[^?]+\?$/.test(segment)) ||
        (segment.includes('*') && (segment !== '*' || i !== segments.length - 1)),
    )
  )
    return null
  return `${raw.startsWith('/') ? '' : parent}/${raw}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
}

export function getMenuLink(menu: MenuVo, origin?: string) {
  const raw = menu.meta?.link || menu.path || menu.route
  if (typeof raw !== 'string') return undefined
  try {
    const url = new URL(raw, origin)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch {
    return undefined
  }
}

export function safeInternalTarget(value: string) {
  if (!value.startsWith('/') || /^\/\/|\\/.test(value) || [...value].some(char => char.charCodeAt(0) < 32)) return null
  try {
    const path = decodeURIComponent(value.split(/[?#]/)[0])
    return /^\/\/|\\/.test(path) || path.split('/').includes('..') ? null : value
  } catch {
    return null
  }
}

export function flattenVisibleMenus(menus: MenuVo[]): MenuVo[] {
  return menus.flatMap(menu => (isVisibleMenu(menu) ? [menu, ...flattenVisibleMenus(menu.children ?? [])] : []))
}

/** 导航高亮使用 React Router 的匹配规则。 */
export function findMenuTrail(menus: MenuVo[], pathname: string) {
  const candidates: Array<{ path: string; trail: Array<{ menu: MenuVo; path: string }> }> = []
  const visit = (items: MenuVo[], parent: string, ancestors: Array<{ menu: MenuVo; path: string }>) => {
    for (const menu of items) {
      if (!isEnabledMenu(menu)) continue
      const path = getMenuPath(menu, parent)
      const trail = path && isVisibleMenu(menu) ? [...ancestors, { menu, path }] : ancestors
      if (path && matchPath({ path, end: false }, pathname)) candidates.push({ path, trail })
      visit(menu.children ?? [], path || parent, trail)
    }
  }
  visit(menus, '', [])
  return (
    matchRoutes(candidates, pathname)?.at(-1)?.route.trail ??
    candidates.sort((a, b) => b.path.length - a.path.length)[0]?.trail ??
    []
  )
}
