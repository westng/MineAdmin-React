import { create } from 'zustand'
import { getInfo, loginApi, logoutApi, refreshApi, type CurrentUserInfo } from '@/modules/base/auth/api/user'
import { useMenuStore } from './useMenuStore'
import { useSettingStore } from '@/provider/settings'
import type { SystemSettings } from '@/types/global'
import { usePluginStore } from '@/provider/plugins'

export type UserInfo = Partial<CurrentUserInfo> & {
  permissions?: string[]
}

interface LoginResult {
  access_token: string
  expire_at: number
  refresh_token: string
}

interface UserState {
  token: string | null
  userInfo: UserInfo | null
  language: string
  initialized: boolean
  loading: boolean
  error: string | null
  roles: string[]
  permissions: string[]
  login: (data: { username: string; password: string; code?: string }) => Promise<LoginResult>
  loginWithTokens: (result: LoginResult, userInfo?: UserInfo) => Promise<LoginResult>
  hydrate: () => Promise<boolean>
  refreshToken: () => Promise<boolean>
  logout: () => Promise<void>
  setUserInfo: (userInfo: UserInfo | null) => void
  setLanguage: (language: string) => void
  hasRole: (role: string | string[]) => boolean
  hasPermission: (permission: string | string[]) => boolean
}

const prefix = import.meta.env.VITE_APP_STORAGE_PREFIX || 'mine_'
const tokenKey = `${prefix}token`
const languageKey = `${prefix}language`
const userInfoKey = `${prefix}user_info`
const refreshTokenKey = `${prefix}refresh_token`
const expireKey = `${prefix}expire`

function readUserInfo(): UserInfo | null {
  const stored = localStorage.getItem(userInfoKey)
  if (!stored) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed === 'object' && parsed !== null && ('username' in parsed || 'nickname' in parsed)) {
      return parsed as UserInfo
    }
  }
  catch {
    localStorage.removeItem(userInfoKey)
  }

  return null
}

export const useUserStore = create<UserState>((set, get) => ({
  token: localStorage.getItem(tokenKey),
  userInfo: readUserInfo(),
  language: localStorage.getItem(languageKey) || 'zh_CN',
  initialized: false,
  loading: false,
  error: null,
  roles: [],
  permissions: [],
  login: async data => {
    await usePluginStore.getState().callHooks('loginBefore', data)
    const response = await loginApi(data)
    const result = response.data.data
    localStorage.setItem(tokenKey, result.access_token)
    localStorage.setItem(refreshTokenKey, result.refresh_token)
    localStorage.setItem(expireKey, String(Date.now() + result.expire_at * 1000))
    const userInfo = { username: data.username }
    localStorage.setItem(userInfoKey, JSON.stringify(userInfo))
    useMenuStore.getState().clearMenus()
    set({ token: result.access_token, userInfo, initialized: false, error: null, roles: [], permissions: [] })
    await usePluginStore.getState().callHooks('login', { username: data.username, ...result })
    return result
  },
  loginWithTokens: async (result, userInfo = { nickname: '飞书用户' }) => {
    localStorage.setItem(tokenKey, result.access_token)
    localStorage.setItem(refreshTokenKey, result.refresh_token)
    localStorage.setItem(expireKey, String(Date.now() + result.expire_at * 1000))
    localStorage.setItem(userInfoKey, JSON.stringify(userInfo))
    useMenuStore.getState().clearMenus()
    set({ token: result.access_token, userInfo, initialized: false, error: null, roles: [], permissions: [] })
    await usePluginStore.getState().callHooks('login', { provider: 'feishu', ...result })
    return result
  },
  hydrate: async () => {
    if (!get().token) {
      set({ initialized: true, loading: false, userInfo: null, roles: [], permissions: [] })
      return false
    }
    if (get().loading) {
      return false
    }
    set({ loading: true, error: null })
    try {
      const response = await getInfo()
      const userInfo = response.data.data
      const menuStore = useMenuStore.getState()
      const menus = await menuStore.refreshMenus()
      const roles = await menuStore.refreshRoles()
      const permissions = roles.includes('SuperAdmin') ? ['*', ...collectPermissions(menus)] : collectPermissions(menus)
      if (userInfo.backend_setting && !Array.isArray(userInfo.backend_setting)) {
        useSettingStore.getState().setSettings(userInfo.backend_setting as Partial<SystemSettings>)
      }
      localStorage.setItem(userInfoKey, JSON.stringify({ ...userInfo, permissions }))
      set({ userInfo: { ...userInfo, permissions }, roles, permissions, initialized: true, loading: false })
      await usePluginStore.getState().callHooks('getUserInfo', userInfo)
      return true
    }
    catch (error) {
      const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message
        : '用户信息加载失败'
      set({ initialized: true, loading: false, error: message })
      await get().logout()
      set({ error: message })
      return false
    }
  },
  refreshToken: async () => {
    const refreshToken = localStorage.getItem(refreshTokenKey)
    if (!refreshToken) return false
    try {
      const response = await refreshApi(refreshToken)
      const result = response.data.data
      localStorage.setItem(tokenKey, result.access_token)
      localStorage.setItem(refreshTokenKey, result.refresh_token)
      localStorage.setItem(expireKey, String(Date.now() + result.expire_at * 1000))
      set({ token: result.access_token })
      return true
    }
    catch {
      return false
    }
  },
  logout: async () => {
    await usePluginStore.getState().callHooks('logout')
    if (get().token) {
      await logoutApi().catch(() => undefined)
    }
    localStorage.removeItem(tokenKey)
    localStorage.removeItem(refreshTokenKey)
    localStorage.removeItem(expireKey)
    localStorage.removeItem(userInfoKey)
    useMenuStore.getState().clearMenus()
    set({ token: null, userInfo: null, initialized: true, loading: false, roles: [], permissions: [] })
  },
  setUserInfo: userInfo => {
    if (userInfo) {
      localStorage.setItem(userInfoKey, JSON.stringify(userInfo))
    }
    else {
      localStorage.removeItem(userInfoKey)
    }
    set({ userInfo })
  },
  setLanguage: language => {
    const nextLanguage = language.trim()
    if (!nextLanguage) return
    localStorage.setItem(languageKey, nextLanguage)
    set({ language: nextLanguage })
  },
  hasRole: role => hasValue(get().roles, role),
  hasPermission: permission => hasValue(get().permissions, permission),
}))

function hasValue(values: string[], expected: string | string[]) {
  if (values.includes('*')) return true
  const candidates = Array.isArray(expected) ? expected : [expected]
  return candidates.some(value => values.includes(value))
}

function collectPermissions(menus: Array<{ name?: string; code?: string; children?: Array<{ name?: string; code?: string; children?: unknown[] }> }>) {
  const permissions: string[] = []
  const visit = (items: typeof menus) => {
    items.forEach((item) => {
      if (item.name) permissions.push(item.name)
      if (item.code) permissions.push(item.code)
      if (Array.isArray(item.children)) visit(item.children as typeof menus)
    })
  }
  visit(menus)
  return [...new Set(permissions)]
}
