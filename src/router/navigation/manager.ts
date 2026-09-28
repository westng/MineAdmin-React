import { createStore } from 'zustand/vanilla'
import { queryKeys } from '@/services/query/client'
import type { QueryClient } from '@tanstack/react-query'
import type { MenuVo } from '@/services/navigation/types'
import type { createNavigationApi } from '@/services/navigation/api'
import type { AppRoute, ViewResolver } from '@/router/types'
import { flattenVisibleMenus, getMenuPath } from './menu'
import { createViewResolver, menuToRoutes } from '@/router/dynamic-routes'
interface NavigationOptions {
  query: QueryClient
  session: () => { sessionVersion: number }
  /** 已启用插件声明的页面。 */
  views?: () => AppRoute[]
  staticRoutes?: readonly AppRoute[]
  viewResolver?: ViewResolver
  origin?: string
  api: ReturnType<typeof createNavigationApi>
  filterMenus: (menus: MenuVo[]) => MenuVo[]
  callHooks: (name: string, ...args: unknown[]) => Promise<void>
}
export interface MenuState {
  menus: MenuVo[]
  /** 菜单转换后的页面元素，供 Router 和导航共同使用。 */
  routes: AppRoute[]
  loading: boolean
  initialized: boolean
  error: string | null
  unauthorized: boolean
  roles: string[]
  refreshMenus: () => Promise<MenuVo[]>
  refreshRoles: () => Promise<string[]>
  getAllMenus: () => MenuVo[]
  getTopMenus: () => MenuVo[]
  getSubMenus: (path: string) => MenuVo[]
  clearMenus: () => void
  refreshRoutes: () => void
}

export function createNavigationManager({
  query: queryClient,
  session,
  views = () => [],
  staticRoutes = [],
  viewResolver = createViewResolver(),
  origin,
  api: { getMenus, getRoles },
  callHooks,
  filterMenus,
}: NavigationOptions) {
  const build = (menus: MenuVo[]) => menuToRoutes(menus, [...staticRoutes, ...views()], viewResolver, origin)
  let menuSequence = 0
  let roleSequence = 0

  return createStore<MenuState>((set, get) => ({
    ...build([]),
    loading: false,
    initialized: false,
    error: null,
    unauthorized: false,
    roles: [],
    refreshMenus: async () => {
      const sequence = ++menuSequence
      set({ loading: true, error: null, unauthorized: false })
      try {
        const response = await queryClient.fetchQuery({
          queryKey: queryKeys.resource(session().sessionVersion, 'auth', 'menus'),
          queryFn: ({ signal }) => getMenus(signal),
          staleTime: 0,
          retry: false,
        })
        if (sequence !== menuSequence) throw new Error('权限加载已取消')
        if (!Array.isArray(response.data.data)) throw new Error('菜单数据格式错误')
        const { menus, routes } = build(filterMenus(response.data.data))
        await callHooks('registerRoute', routes, menus)
        if (sequence !== menuSequence) throw new Error('权限加载已取消')
        set({ menus, routes, loading: false, initialized: true, error: null, unauthorized: false })
        return menus
      } catch (error) {
        if (sequence !== menuSequence) throw error
        const message = error instanceof Error ? error.message : '动态菜单加载失败'
        const unauthorized = typeof error === 'object' && error !== null && 'code' in error && error.code === 401
        set({ loading: false, initialized: false, error: message, unauthorized })
        throw error
      }
    },
    refreshRoles: async () => {
      const sequence = ++roleSequence
      try {
        const response = await queryClient.fetchQuery({
          queryKey: queryKeys.resource(session().sessionVersion, 'auth', 'roles'),
          queryFn: ({ signal }) => getRoles(signal),
          staleTime: 0,
          retry: false,
        })
        if (sequence !== roleSequence) throw new Error('权限加载已取消')
        if (!Array.isArray(response.data.data)) throw new Error('角色数据格式错误')
        const roles = Array.isArray(response.data.data)
          ? response.data.data.map(role => role.code).filter((code): code is string => Boolean(code))
          : []
        set({ roles })
        return roles
      } catch (error) {
        if (sequence !== roleSequence) throw error
        const unauthorized = typeof error === 'object' && error !== null && 'code' in error && error.code === 401
        set({
          loading: false,
          initialized: false,
          unauthorized,
          error: error instanceof Error ? error.message : '角色加载失败',
        })
        throw error
      }
    },
    getAllMenus: () => flattenVisibleMenus(get().menus),
    getTopMenus: () => get().menus.filter(menu => menu.parent_id === undefined || menu.parent_id === 0),
    getSubMenus: path => {
      const menu = get().menus.find(item => getMenuPath(item) === path)
      return menu?.children?.filter(item => item.status !== 2) || []
    },
    clearMenus: () => {
      menuSequence += 1
      roleSequence += 1
      set({
        ...build([]),
        roles: [],
        loading: false,
        initialized: false,
        error: null,
        unauthorized: false,
      })
    },
    refreshRoutes: () => set(build(get().menus)),
  }))
}
