import { create } from 'zustand'
import type { MenuVo } from '@/modules/base/api/permission'
import { getMenuPath, isVisibleMenu } from '@/router/dynamic-menu'

export interface RuntimeRoute {
  name: string
  path: string
  component?: string
  meta: MenuVo['meta']
  menu: MenuVo
}

interface RouteState {
  routes: RuntimeRoute[]
  flattened: RuntimeRoute[]
  initialized: boolean
  build: (menus: MenuVo[]) => RuntimeRoute[]
  find: (path: string) => RuntimeRoute | undefined
  clear: () => void
}

function flatten(menus: MenuVo[], result: RuntimeRoute[] = []) {
  menus.filter(isVisibleMenu).forEach(menu => {
    const path = getMenuPath(menu)
    if (!path) return
    result.push({ name: menu.name || path, path, component: menu.component, meta: menu.meta, menu })
    if (menu.children) flatten(menu.children, result)
  })
  return result
}

export const useRouteStore = create<RouteState>((set, get) => ({
  routes: [],
  flattened: [],
  initialized: false,
  build: menus => {
    const routes = menus.filter(isVisibleMenu).flatMap(menu => {
      const path = getMenuPath(menu)
      return path ? [{ name: menu.name || path, path, component: menu.component, meta: menu.meta, menu }] : []
    })
    const flattened = flatten(menus)
    set({ routes, flattened, initialized: true })
    return routes
  },
  find: path => get().flattened.filter(route => path === route.path || path.startsWith(`${route.path}/`)).sort((left, right) => right.path.length - left.path.length)[0],
  clear: () => set({ routes: [], flattened: [], initialized: false }),
}))

export default useRouteStore
