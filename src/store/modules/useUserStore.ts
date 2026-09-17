import { create } from 'zustand'
import { getInfo, loginApi, logoutApi, refreshApi, type CurrentUserInfo } from '@/modules/base/auth/api/user'
import { useMenuStore } from './useMenuStore'
import { getPersistedPrimaryColor, useSettingStore } from '@/provider/settings'
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
  sessionVersion: number
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

let refreshTask: { version: number; promise: Promise<boolean> } | null = null

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
  sessionVersion: 0,
  userInfo: readUserInfo(),
  language: localStorage.getItem(languageKey) || 'zh_CN',
  initialized: false,
  loading: false,
  error: null,
  roles: [],
  permissions: [],
  login: async data => {
    const startedVersion = get().sessionVersion + 1
    set({ sessionVersion: startedVersion, loading: false })
    await usePluginStore.getState().callHooks('loginBefore', data)
    if (get().sessionVersion !== startedVersion) throw new Error('登录已取消')
    const response = await loginApi(data)
    if (get().sessionVersion !== startedVersion) throw new Error('登录已取消')
    const result = response.data.data
    persistSession(result, { username: data.username })
    await usePluginStore.getState().callHooks('login', { username: data.username, ...result })
    return result
  },
  loginWithTokens: async (result, userInfo = { nickname: '飞书用户' }) => {
    persistSession(result, userInfo)
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
    const startedVersion = get().sessionVersion
    const isCurrent = () => get().sessionVersion === startedVersion
    set({ loading: true, error: null })
    try {
      const response = await getInfo()
      if (!isCurrent()) return false
      const userInfo = response.data.data
      const menuStore = useMenuStore.getState()
      const menus = await menuStore.refreshMenus()
      if (!isCurrent()) return false
      const roles = await menuStore.refreshRoles()
      if (!isCurrent()) return false
      const permissions = roles.includes('SuperAdmin') ? ['*', ...collectPermissions(menus)] : collectPermissions(menus)
      if (userInfo.backend_setting && !Array.isArray(userInfo.backend_setting)) {
        const backendSettings = userInfo.backend_setting as Partial<SystemSettings>
        const persistedPrimaryColor = getPersistedPrimaryColor()
        const currentSettings = useSettingStore.getState().settings
        useSettingStore.getState().setSettings({
          ...backendSettings,
          app: {
            ...currentSettings.app,
            ...backendSettings.app,
            ...(persistedPrimaryColor ? { primaryColor: persistedPrimaryColor } : {}),
          },
        })
      }
      localStorage.setItem(userInfoKey, JSON.stringify({ ...userInfo, permissions }))
      set({ userInfo: { ...userInfo, permissions }, roles, permissions, initialized: true, loading: false })
      await usePluginStore.getState().callHooks('getUserInfo', userInfo)
      return true
    }
    catch (error) {
      if (!isCurrent()) return false
      const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message
        : '用户信息加载失败'
      const unauthorized = typeof error === 'object' && error !== null && 'code' in error && Number(error.code) === 401
      set({ initialized: false, loading: false, error: message, roles: [], permissions: [] })
      if (unauthorized) {
        void get().logout()
      }
      return false
    }
  },
  refreshToken: async () => {
    const startedVersion = get().sessionVersion
    if (refreshTask?.version === startedVersion) return refreshTask.promise
    const refreshToken = localStorage.getItem(refreshTokenKey)
    if (!refreshToken) {
      clearSession()
      return false
    }
    const isCurrent = () => get().sessionVersion === startedVersion && localStorage.getItem(refreshTokenKey) === refreshToken
    const promise = (async () => {
      try {
        const response = await refreshApi(refreshToken)
        if (!isCurrent()) return false
        const result = response.data.data
        localStorage.setItem(tokenKey, result.access_token)
        localStorage.setItem(refreshTokenKey, result.refresh_token)
        localStorage.setItem(expireKey, String(Date.now() + result.expire_at * 1000))
        set({ token: result.access_token })
        return true
      }
      catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? Number(error.code) : undefined
        if (code === 401 && isCurrent()) clearSession()
        return false
      }
      finally {
        if (refreshTask?.version === startedVersion) refreshTask = null
      }
    })()
    refreshTask = { version: startedVersion, promise }
    return promise
  },
  logout: async () => {
    const token = get().token
    clearSession()
    // Explicit credentials keep a delayed logout tied to the old session.
    const request = token ? logoutApi(token).catch(() => undefined) : Promise.resolve()
    await Promise.allSettled([request, usePluginStore.getState().callHooks('logout')])
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

function persistSession(result: LoginResult, userInfo: UserInfo) {
  localStorage.setItem(tokenKey, result.access_token)
  localStorage.setItem(refreshTokenKey, result.refresh_token)
  localStorage.setItem(expireKey, String(Date.now() + result.expire_at * 1000))
  localStorage.setItem(userInfoKey, JSON.stringify(userInfo))
  useMenuStore.getState().clearMenus()
  useUserStore.setState(state => ({ token: result.access_token, userInfo, initialized: false, loading: false, error: null, roles: [], permissions: [], sessionVersion: state.sessionVersion + 1 }))
}

function clearSession() {
  for (const key of [tokenKey, refreshTokenKey, expireKey, userInfoKey]) localStorage.removeItem(key)
  useMenuStore.getState().clearMenus()
  useUserStore.setState(state => ({ token: null, userInfo: null, initialized: false, loading: false, error: null, roles: [], permissions: [], sessionVersion: state.sessionVersion + 1 }))
}

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
