import type { ReactNode } from 'react'
import type { MenuVo } from '@/modules/base/permission/menu/api/permission'
import type { AppRoute } from './types'
import { flattenMenuRoutes, getMenuPath } from './dynamic-menu'
import { routePathKey, routePatternsOverlap, isValidRoutePattern } from './path-pattern'

export interface RouteDescriptor extends Omit<AppRoute, 'children'> {
  children?: never
  source?: 'static' | 'menu' | 'plugin'
  scope?: 'protected' | 'guest' | 'public'
  componentId?: string
}
export interface MenuRoute {
  name: string
  path: string
  component?: string
  meta: MenuVo['meta']
  menu: MenuVo
}
export interface RouteSnapshot {
  protectedRoutes: AppRoute[]
  guestRoutes: AppRoute[]
  publicRoutes: AppRoute[]
  menuRoutes: MenuRoute[]
  menus: MenuVo[]
  initialized: boolean
}
const canonical = routePathKey
// The root catch-all is a fallback, not an explicitly owned URL domain.
const overlapsOwnedPath = (paths: Iterable<string>, path: string) =>
  [...paths].some(candidate => candidate !== '/*' && routePatternsOverlap(candidate, path))

export function createRouteRegistry() {
  let layout: AppRoute = { name: 'root', path: '/', children: [] }
  let guests: AppRoute[] = []
  let publics: AppRoute[] = []
  let menus: MenuVo[] = []
  let initialized = false
  let renderMenu: (menu: MenuVo) => ReactNode = () => null
  const plugins = new Map<string, readonly RouteDescriptor[]>()
  const listeners = new Set<() => void>()
  let snapshot: RouteSnapshot = {
    protectedRoutes: [],
    guestRoutes: [],
    publicRoutes: [],
    menuRoutes: [],
    menus: [],
    initialized: false,
  }
  const collectPaths = (routes: readonly AppRoute[], parent = '') => {
    const paths = new Set<string>()
    const visit = (items: readonly AppRoute[], prefix: string) => {
      for (const route of items) {
        const path = canonical(`${prefix}/${route.path}`)
        paths.add(path)
        if (route.children) visit(route.children, path)
      }
    }
    visit(routes, parent)
    return paths
  }

  function publish() {
    const flattened = flattenMenuRoutes(menus)
    const menuRoutes = flattened.flatMap(({ menu }) => {
      const path = getMenuPath(menu)
      return path ? [{ name: menu.name || path, path, component: menu.component, meta: menu.meta, menu }] : []
    })
    const pluginRoutes = [...plugins.values()].flat()
    const protectedPaths = collectPaths(layout.children || [])
    for (const route of menuRoutes) protectedPaths.add(canonical(route.path))
    const guestPaths = collectPaths(guests)
    const publicPaths = collectPaths(publics)
    for (const route of pluginRoutes) {
      const target = route.scope === 'guest' ? guestPaths : route.scope === 'public' ? publicPaths : protectedPaths
      target.add(canonical(route.path))
    }
    for (const path of [...guestPaths, ...publicPaths]) {
      if (path !== '/*' && overlapsOwnedPath(protectedPaths, path)) throw new Error(`Protected route conflict: ${path}`)
    }
    for (const path of guestPaths) {
      if (path !== '/*' && overlapsOwnedPath(publicPaths, path)) throw new Error(`Guest/public route conflict: ${path}`)
    }
    const protectedPlugins = pluginRoutes.filter(route => !route.scope || route.scope === 'protected')
    const rawDynamic = flattened.flatMap(({ menu, accessMeta }): AppRoute[] => {
      const path = getMenuPath(menu)
      if (!path) return []
      const contributions = protectedPlugins.filter(route => canonical(route.path) === canonical(path))
      return [
        {
          name: `dynamic:${canonical(path)}`,
          path: path.replace(/^\//, ''),
          element: contributions[0]?.element ?? renderMenu(menu),
          meta: menu.meta,
          accessMeta: [
            ...accessMeta,
            ...contributions.flatMap(route => [...(route.meta ? [route.meta] : []), ...(route.accessMeta || [])]),
          ],
        },
      ]
    })
    const byPath = new Map<string, AppRoute>()
    for (const route of rawDynamic) {
      const key = canonical(route.path)
      const previous = byPath.get(key)
      byPath.set(
        key,
        previous ? { ...previous, accessMeta: [...(previous.accessMeta || []), ...(route.accessMeta || [])] } : route,
      )
    }
    const dynamic = [...byPath.values()]
    const occupied = new Set<string>()
    const restrictStatic = (routes: AppRoute[], parent = ''): AppRoute[] =>
      routes.map(route => {
        const path = canonical(`${parent}/${route.path}`)
        occupied.add(path)
        const restrictions = dynamic
          .filter(candidate => canonical(candidate.path) === path)
          .flatMap(candidate => candidate.accessMeta || [])
        const pluginRestrictions = protectedPlugins
          .filter(candidate => canonical(candidate.path) === path)
          .flatMap(candidate => [...(candidate.meta ? [candidate.meta] : []), ...(candidate.accessMeta || [])])
        return {
          ...route,
          accessMeta: [
            ...(route.accessMeta || []),
            ...restrictions,
            ...(dynamic.some(candidate => canonical(candidate.path) === path) ? [] : pluginRestrictions),
          ],
          children: route.children ? restrictStatic(route.children, path) : undefined,
        }
      })
    const children = restrictStatic(layout.children || [])
    for (const route of [...dynamic, ...protectedPlugins]) {
      const path = canonical(route.path)
      if (occupied.has(path)) continue
      occupied.add(path)
      children.push({ ...route, path: route.path.replace(/^\//, '') })
    }
    snapshot = {
      protectedRoutes: [{ ...layout, children }],
      guestRoutes: [...guests, ...pluginRoutes.filter(route => route.scope === 'guest')],
      publicRoutes: [...publics, ...pluginRoutes.filter(route => route.scope === 'public')],
      menuRoutes,
      menus,
      initialized,
    }
    for (const listener of listeners) listener()
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => snapshot,
    configure(options: {
      layout: AppRoute
      guests: AppRoute[]
      publics: AppRoute[]
      renderMenu: (menu: MenuVo) => ReactNode
    }) {
      const previous = { layout, guests, publics, renderMenu }
      layout = options.layout
      guests = options.guests
      publics = options.publics
      renderMenu = options.renderMenu
      try {
        publish()
      } catch (error) {
        ;({ layout, guests, publics, renderMenu } = previous)
        throw error
      }
    },
    setMenus(value: MenuVo[]) {
      const previous = menus
      const wasInitialized = initialized
      menus = value
      initialized = true
      try {
        publish()
      } catch (error) {
        menus = previous
        initialized = wasInitialized
        throw error
      }
      return snapshot.menuRoutes
    },
    clearMenus() {
      menus = []
      initialized = false
      publish()
    },
    register(owner: string, routes: readonly RouteDescriptor[]) {
      if (!owner.trim() || plugins.has(owner)) throw new Error(`Duplicate or empty route owner: ${owner}`)
      const paths = new Set<string>()
      const staticProtectedPaths = collectPaths(layout.children || [])
      for (const { menu } of flattenMenuRoutes(menus)) {
        const path = getMenuPath(menu)
        if (path) staticProtectedPaths.add(canonical(path))
      }
      const staticGuestPaths = collectPaths(guests)
      const staticPublicPaths = collectPaths(publics)
      for (const route of routes) {
        if (
          typeof route.path !== 'string' ||
          typeof route.name !== 'string' ||
          !route.name.trim() ||
          (route.scope !== undefined && !['protected', 'guest', 'public'].includes(route.scope)) ||
          route.children ||
          /[#\\]/.test(route.path) ||
          !isValidRoutePattern(route.path) ||
          route.path.includes('..') ||
          route.path.startsWith('//') ||
          /^[a-z]+:/i.test(route.path)
        )
          throw new Error('Invalid route descriptor')
        const path = canonical(route.path)
        if (path === '/*' || path === '/' || paths.has(path))
          throw new Error(`Invalid or duplicate route: ${route.path}`)
        if ([...plugins.values()].flat().some(other => canonical(other.path) === path))
          throw new Error(`Route conflict: ${path}`)
        if (overlapsOwnedPath(staticGuestPaths, path) || overlapsOwnedPath(staticPublicPaths, path))
          throw new Error(`Reserved route: ${path}`)
        if (route.scope && route.scope !== 'protected' && overlapsOwnedPath(staticProtectedPaths, path))
          throw new Error(`Protected route conflict: ${path}`)
        if (
          route.scope &&
          route.scope !== 'protected' &&
          (route.meta?.permission !== undefined ||
            (route.meta?.auth !== undefined && route.meta.auth !== false) ||
            route.meta?.permissions !== undefined ||
            route.meta?.role !== undefined ||
            route.meta?.roles !== undefined ||
            route.meta?.user !== undefined ||
            route.accessMeta?.length)
        )
          throw new Error('Public and guest routes cannot carry protected access policies')
        paths.add(path)
      }
      plugins.set(owner, routes)
      try {
        publish()
      } catch (error) {
        plugins.delete(owner)
        throw error
      }
      return () => {
        if (plugins.get(owner) === routes) {
          plugins.delete(owner)
          publish()
        }
      }
    },
  }
}
export type RouteRegistry = ReturnType<typeof createRouteRegistry>
export const routeRegistry = createRouteRegistry()
