import { create } from 'zustand'
import { getMenus, getRoles, type MenuVo } from '@/modules/base/permission/menu/api/permission'
import cache from '@/hooks/useCache'
import { flattenVisibleMenus, getMenuPath, removeRetiredMenus } from '@/router/dynamic-menu'
import { useRouteStore } from './useRouteStore'
import { usePluginStore } from '@/provider/plugins'

interface MenuState {
  menus: MenuVo[]
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
}

let menuSequence = 0
let roleSequence = 0

export const useMenuStore = create<MenuState>((set, get) => ({
  menus: removeRetiredMenus(cache.get<MenuVo[]>('menus', [])),
  loading: false,
  initialized: false,
  error: null,
  unauthorized: false,
  roles: [],
  refreshMenus: async () => {
    const sequence = ++menuSequence
    set({ loading: true, error: null, unauthorized: false })
    try {
      const response = await getMenus()
      if (sequence !== menuSequence) throw new Error('权限加载已取消')
      if (!Array.isArray(response.data.data)) throw new Error('菜单数据格式错误')
      const menus = removeRetiredMenus(Array.isArray(response.data.data) ? response.data.data : [])
      cache.set('menus', menus)
      const routes = useRouteStore.getState().build(menus)
      await usePluginStore.getState().callHooks('registerRoute', routes)
      if (sequence !== menuSequence) throw new Error('权限加载已取消')
      set({ menus, loading: false, initialized: true, error: null, unauthorized: false })
      return menus
    }
    catch (error) {
      if (sequence !== menuSequence) throw error
      const message = error instanceof Error ? error.message : '动态菜单加载失败'
      const unauthorized = typeof error === 'object' && error !== null && 'code' in error && error.code === 401
      cache.remove('menus')
      useRouteStore.getState().clear()
      set({ menus: [], roles: [], loading: false, initialized: false, error: message, unauthorized })
      throw error
    }
  },
  refreshRoles: async () => {
    const sequence = ++roleSequence
    try {
      const response = await getRoles()
      if (sequence !== roleSequence) throw new Error('权限加载已取消')
      if (!Array.isArray(response.data.data)) throw new Error('角色数据格式错误')
      const roles = Array.isArray(response.data.data)
        ? response.data.data.map(role => role.code).filter((code): code is string => Boolean(code))
        : []
      set({ roles })
      return roles
    }
    catch (error) {
      if (sequence !== roleSequence) throw error
      const unauthorized = typeof error === 'object' && error !== null && 'code' in error && error.code === 401
      cache.remove('menus')
      useRouteStore.getState().clear()
      set({ menus: [], roles: [], loading: false, initialized: false, unauthorized, error: error instanceof Error ? error.message : '角色加载失败' })
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
    cache.remove('menus')
    useRouteStore.getState().clear()
    set({ menus: [], roles: [], loading: false, initialized: false, error: null, unauthorized: false })
  },
}))
