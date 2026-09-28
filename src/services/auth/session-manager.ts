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
  synchronize: () => boolean
}

export interface SessionPorts {
  storage: StorageAdapter
  prefix: string
  api: {
    login: (data: LoginParams, signal?: AbortSignal) => Promise<{ data: { data: LoginResult } }>
    refresh: (token: string, signal?: AbortSignal) => Promise<{ data: { data: LoginResult } }>
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
  const identityKey = `${prefix}session_id`
  let identity = ports.storage.getItem(identityKey)

  let refreshTask: { version: number; promise: Promise<boolean> } | null = null
  let loadTask: { version: number; promise: Promise<boolean> } | null = null
  const lifetime = new AbortController()
  let disposed = false

  function assertActive() {
    if (disposed) throw new DOMException('会话已释放', 'AbortError')
  }

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
      assertActive()
      const startedVersion = get().sessionVersion + 1
      set({ sessionVersion: startedVersion, loading: false })
      await ports.callHooks('loginBefore', data)
      assertActive()
      if (get().sessionVersion !== startedVersion) throw new Error('登录已取消')
      const response = await ports.api.login(data, lifetime.signal)
      assertActive()
      if (get().sessionVersion !== startedVersion) throw new Error('登录已取消')
      const result = validateResponse(tokenSchema, response.data.data, 'session')
      persistSession(result, { username: data.username })
      const persistedVersion = get().sessionVersion
      await ports.callHooks('login', { username: data.username, ...result })
      assertActive()
      if (get().sessionVersion !== persistedVersion) throw new Error('登录已取消')
      return result
    },
    loginWithTokens: async (result, userInfo = {}) => {
      assertActive()
      persistSession(validateResponse(tokenSchema, result, 'session'), userInfo)
      const persistedVersion = get().sessionVersion
      await ports.callHooks('login', { provider: 'external', ...result })
      assertActive()
      if (get().sessionVersion !== persistedVersion) throw new Error('登录已取消')
      return result
    },
    hydrate: async () => {
      if (disposed) return false
      synchronize()
      if (!get().token) {
        set({ initialized: true, loading: false, userInfo: null, roles: [], permissions: [] })
        return false
      }
      return get().initialized || loadUser()
    },
    refreshToken: async () => {
      if (disposed) return false
      if (synchronize()) return false
      const startedVersion = get().sessionVersion
      if (refreshTask?.version === startedVersion) return refreshTask.promise
      const refreshToken = ports.storage.getItem(refreshTokenKey)
      if (!refreshToken) {
        clearSession()
        return false
      }
      const isCurrent = () =>
        !disposed &&
        !synchronize() &&
        get().sessionVersion === startedVersion &&
        ports.storage.getItem(refreshTokenKey) === refreshToken
      const promise = (async () => {
        try {
          const response = await ports.api.refresh(refreshToken, lifetime.signal)
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
      if (disposed) return
      synchronize()
      const token = get().token
      clearSession()
      // Explicit credentials keep a delayed logout tied to the old session.
      const request = token ? ports.api.logout(token).catch(() => undefined) : Promise.resolve()
      await Promise.allSettled([request, ports.callHooks('logout')])
    },
    setUserInfo: userInfo => {
      assertActive()
      if (userInfo) {
        ports.storage.setItem(userInfoKey, JSON.stringify(userInfo))
      } else {
        ports.storage.removeItem(userInfoKey)
      }
      set({ userInfo })
    },
    setLanguage: language => {
      assertActive()
      const nextLanguage = language.trim()
      if (!nextLanguage) return
      ports.storage.setItem(languageKey, nextLanguage)
      set({ language: nextLanguage })
    },
    hasRole: role => hasValue(get().roles, role),
    hasPermission: permission => hasValue(get().permissions, permission),
    synchronize,
  }))

  /** 同一会话共享初始化任务；暂时失败保留凭据，让守卫显示重试入口。 */
  function loadUser(): Promise<boolean> {
    const startedVersion = session.getState().sessionVersion
    if (loadTask?.version === startedVersion) return loadTask.promise
    const isCurrent = () => !disposed && !synchronize() && session.getState().sessionVersion === startedVersion
    const promise = (async () => {
      session.setState({ loading: true, error: null })
      let step = '用户信息加载'
      try {
        const response = await ports.api.info()
        if (!isCurrent()) return false
        const userInfo = validateResponse(profileSchema, response.data.data, 'session') as CurrentUserInfo
        step = '菜单加载'
        const menus = await ports.menus.refreshMenus()
        if (!isCurrent()) return false
        step = '角色加载'
        const roles = await ports.menus.refreshRoles()
        if (!isCurrent()) return false
        step = '用户配置初始化'
        const permissions = roles.includes('SuperAdmin')
          ? ['*', ...collectPermissions(menus)]
          : collectPermissions(menus)
        if (userInfo.backend_setting && !Array.isArray(userInfo.backend_setting)) {
          ports.applySettings(userInfo.backend_setting)
        }
        ports.storage.setItem(userInfoKey, JSON.stringify({ ...userInfo, permissions }))
        session.setState({
          userInfo: { ...userInfo, permissions },
          roles,
          permissions,
          initialized: true,
          loading: false,
        })
        step = '用户扩展初始化'
        await ports.callHooks('getUserInfo', userInfo)
        return isCurrent()
      } catch (error) {
        if (isCurrent()) {
          const code = typeof error === 'object' && error !== null && 'code' in error ? Number(error.code) : undefined
          if (code === 401) await session.getState().logout()
          else session.setState({ initialized: false, loading: false, error: `${step}失败，请重试` })
        }
        return false
      } finally {
        if (loadTask?.version === startedVersion) loadTask = null
      }
    })()
    loadTask = { version: startedVersion, promise }
    return promise
  }

  function persistSession(result: LoginResult, userInfo: UserInfo) {
    assertActive()
    identity = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), byte =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    ports.storage.setItem(tokenKey, result.access_token)
    ports.storage.setItem(refreshTokenKey, result.refresh_token)
    ports.storage.setItem(expireKey, String(Date.now() + result.expire_at * 1000))
    ports.storage.setItem(userInfoKey, JSON.stringify(userInfo))
    ports.storage.setItem(identityKey, identity)
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
    if (disposed) return
    if (ports.storage.getItem(identityKey) === identity) {
      for (const key of [tokenKey, refreshTokenKey, expireKey, userInfoKey, identityKey]) ports.storage.removeItem(key)
    }
    identity = ports.storage.getItem(identityKey)
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

  function synchronize() {
    if (disposed) return false
    const nextIdentity = ports.storage.getItem(identityKey)
    const token = ports.storage.getItem(tokenKey)
    if (nextIdentity === identity) {
      // A refresh rotates credentials within the same identity. Legacy sessions
      // without an identity marker are invalidated if their credentials change.
      if (token === session.getState().token) return false
      if (identity !== null && token) {
        session.setState({ token })
        return false
      }
    }
    identity = nextIdentity
    refreshTask = null
    loadTask = null
    if (!token) {
      ports.menus.clearMenus()
      session.setState(state => ({
        token: null,
        userInfo: null,
        roles: [],
        permissions: [],
        initialized: false,
        loading: false,
        error: null,
        sessionVersion: state.sessionVersion + 1,
      }))
      return true
    }
    // A new account must never render the previous account's pages while its permissions load.
    ports.menus.clearMenus()
    session.setState(state => ({
      token,
      loading: false,
      error: null,
      sessionVersion: state.sessionVersion + 1,
      userInfo: null,
      roles: [],
      permissions: [],
      initialized: false,
    }))
    return true
  }
  const unsubscribe = ports.storage.subscribe?.(key => {
    if (key === null || [identityKey, tokenKey, refreshTokenKey].includes(key)) synchronize()
  })
  return Object.assign(session, {
    dispose() {
      if (disposed) return
      disposed = true
      lifetime.abort()
      refreshTask = null
      loadTask = null
      unsubscribe?.()
    },
  })
}

export type SessionManager = Pick<ReturnType<typeof createSessionManager>, 'getState' | 'getInitialState' | 'subscribe'>
