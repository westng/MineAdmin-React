import { evaluateAccess } from './access'
import { tokenSchema, profileSchema, validateResponse } from './schemas'
import { createStore } from 'zustand/vanilla'
import type { CurrentUserInfo, LoginParams } from './types'
import type { StorageAdapter } from '@/services/storage'

export type UserInfo = Partial<CurrentUserInfo> & {
  permissions?: string[]
}

interface LoginResult {
  access_token: string
  expire_at: number
  refresh_token: string
}

export interface UserState {
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

export interface SessionPorts {
  storage: StorageAdapter
  prefix: string
  api: {
    login: (data: LoginParams) => Promise<{ data: { data: LoginResult } }>
    refresh: (token: string) => Promise<{ data: { data: LoginResult } }>
    logout: (token: string) => Promise<unknown>
    info: () => Promise<{ data: { data: CurrentUserInfo } }>
  }
  menus: {
    clearMenus: () => void
    refreshMenus: () => Promise<PermissionMenu[]>
    refreshRoles: () => Promise<string[]>
  }
  callHooks: (name: string, ...args: unknown[]) => Promise<void>
  applySettings: (settings: Record<string, unknown>) => void
}
interface PermissionMenu {
  name?: string
  code?: string
  children?: PermissionMenu[]
}

export function createSessionManager(ports: SessionPorts) {
  const prefix = ports.prefix
  const tokenKey = `${prefix}token`
  const languageKey = `${prefix}language`
  const userInfoKey = `${prefix}user_info`
  const refreshTokenKey = `${prefix}refresh_token`
  const expireKey = `${prefix}expire`

  let refreshTask: { version: number; promise: Promise<boolean> } | null = null

  function readUserInfo(): UserInfo | null {
    const stored = ports.storage.getItem(userInfoKey)
    if (!stored) {
      return null
    }

    try {
      const parsed: unknown = JSON.parse(stored)
      if (typeof parsed === 'object' && parsed !== null && ('username' in parsed || 'nickname' in parsed)) {
        return parsed as UserInfo
      }
    } catch {
      ports.storage.removeItem(userInfoKey)
    }

    return null
  }

  const session = createStore<UserState>((set, get) => ({
    token: ports.storage.getItem(tokenKey),
    sessionVersion: 0,
    userInfo: readUserInfo(),
    language: ports.storage.getItem(languageKey) || 'zh_CN',
    initialized: false,
    loading: false,
    error: null,
    roles: [],
    permissions: [],
    login: async data => {
      const startedVersion = get().sessionVersion + 1
      set({ sessionVersion: startedVersion, loading: false })
      await ports.callHooks('loginBefore', data)
      if (get().sessionVersion !== startedVersion) throw new Error('登录已取消')
      const response = await ports.api.login(data)
      if (get().sessionVersion !== startedVersion) throw new Error('登录已取消')
      const result = validateResponse(tokenSchema, response.data.data, 'session')
      persistSession(result, { username: data.username })
      await ports.callHooks('login', { username: data.username, ...result })
      return result
    },
    loginWithTokens: async (result, userInfo = {}) => {
      persistSession(validateResponse(tokenSchema, result, 'session'), userInfo)
      await ports.callHooks('login', { provider: 'external', ...result })
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
        const response = await ports.api.info()
        if (!isCurrent()) return false
        const userInfo = validateResponse(profileSchema, response.data.data, 'session') as CurrentUserInfo
        const menuStore = ports.menus
        const menus = await menuStore.refreshMenus()
        if (!isCurrent()) return false
        const roles = await menuStore.refreshRoles()
        if (!isCurrent()) return false
        const permissions = roles.includes('SuperAdmin')
          ? ['*', ...collectPermissions(menus)]
          : collectPermissions(menus)
        if (userInfo.backend_setting && !Array.isArray(userInfo.backend_setting)) {
          ports.applySettings(userInfo.backend_setting)
        }
        ports.storage.setItem(userInfoKey, JSON.stringify({ ...userInfo, permissions }))
        set({ userInfo: { ...userInfo, permissions }, roles, permissions, initialized: true, loading: false })
        await ports.callHooks('getUserInfo', userInfo)
        return true
      } catch (error) {
        if (!isCurrent()) return false
        const message =
          typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
            ? error.message
            : '用户信息加载失败'
        const unauthorized =
          typeof error === 'object' && error !== null && 'code' in error && Number(error.code) === 401
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
      const refreshToken = ports.storage.getItem(refreshTokenKey)
      if (!refreshToken) {
        clearSession()
        return false
      }
      const isCurrent = () =>
        get().sessionVersion === startedVersion && ports.storage.getItem(refreshTokenKey) === refreshToken
      const promise = (async () => {
        try {
          const response = await ports.api.refresh(refreshToken)
          if (!isCurrent()) return false
          const result = validateResponse(tokenSchema, response.data.data, 'session')
          ports.storage.setItem(tokenKey, result.access_token)
          ports.storage.setItem(refreshTokenKey, result.refresh_token)
          ports.storage.setItem(expireKey, String(Date.now() + result.expire_at * 1000))
          set({ token: result.access_token })
          return true
        } catch (error) {
          const code = typeof error === 'object' && error !== null && 'code' in error ? Number(error.code) : undefined
          if (code === 401 && isCurrent()) clearSession()
          return false
        } finally {
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
      const request = token ? ports.api.logout(token).catch(() => undefined) : Promise.resolve()
      await Promise.allSettled([request, ports.callHooks('logout')])
    },
    setUserInfo: userInfo => {
      if (userInfo) {
        ports.storage.setItem(userInfoKey, JSON.stringify(userInfo))
      } else {
        ports.storage.removeItem(userInfoKey)
      }
      set({ userInfo })
    },
    setLanguage: language => {
      const nextLanguage = language.trim()
      if (!nextLanguage) return
      ports.storage.setItem(languageKey, nextLanguage)
      set({ language: nextLanguage })
    },
    hasRole: role => hasValue(get().roles, role),
    hasPermission: permission => hasValue(get().permissions, permission),
  }))

  function persistSession(result: LoginResult, userInfo: UserInfo) {
    ports.storage.setItem(tokenKey, result.access_token)
    ports.storage.setItem(refreshTokenKey, result.refresh_token)
    ports.storage.setItem(expireKey, String(Date.now() + result.expire_at * 1000))
    ports.storage.setItem(userInfoKey, JSON.stringify(userInfo))
    ports.menus.clearMenus()
    session.setState(state => ({
      token: result.access_token,
      userInfo,
      initialized: false,
      loading: false,
      error: null,
      roles: [],
      permissions: [],
      sessionVersion: state.sessionVersion + 1,
    }))
  }

  function clearSession() {
    for (const key of [tokenKey, refreshTokenKey, expireKey, userInfoKey]) ports.storage.removeItem(key)
    ports.menus.clearMenus()
    session.setState(state => ({
      token: null,
      userInfo: null,
      initialized: false,
      loading: false,
      error: null,
      roles: [],
      permissions: [],
      sessionVersion: state.sessionVersion + 1,
    }))
  }

  function hasValue(values: string[], expected: string | string[]) {
    return evaluateAccess({ permission: expected }, { permissions: values, roles: [], userInfo: null })
  }

  function collectPermissions(
    menus: Array<{
      name?: string
      code?: string
      children?: Array<{ name?: string; code?: string; children?: unknown[] }>
    }>,
  ) {
    const permissions: string[] = []
    const visit = (items: typeof menus) => {
      items.forEach(item => {
        if (item.name) permissions.push(item.name)
        if (item.code) permissions.push(item.code)
        if (Array.isArray(item.children)) visit(item.children as typeof menus)
      })
    }
    visit(menus)
    return [...new Set(permissions)]
  }

  return session
}

export type SessionManager = Pick<ReturnType<typeof createSessionManager>, 'getState' | 'getInitialState' | 'subscribe'>
