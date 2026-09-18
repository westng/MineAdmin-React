import { queryClient, queryKeys, bindQuerySession } from '@/provider/query/client'
import { useStore } from 'zustand'
import { createSessionManager, type UserState } from '@/services/auth/session-manager'
import { getInfo, loginApi, logoutApi, refreshApi } from '@/modules/base/auth/api/user'
import { useNavigationStore } from '../navigation'
import { getPersistedPrimaryColor, useSettingStore } from '@/provider/settings'
import type { SystemSettings } from '@/types/global'
import { usePluginStore } from '@/provider/plugins'

export type { UserInfo } from '@/services/auth/session-manager'

// Application session composition. The vanilla SessionManager owns all session state.
export const sessionManager = createSessionManager({
  storage: localStorage,
  prefix: import.meta.env.VITE_APP_STORAGE_PREFIX || 'mine_',
  api: {
    login: loginApi,
    refresh: refreshApi,
    logout: logoutApi,
    info: () =>
      queryClient.fetchQuery({
        queryKey: queryKeys.resource(sessionManager.getState().sessionVersion, 'auth', 'profile'),
        queryFn: ({ signal }) => getInfo(signal),
        staleTime: 0,
        retry: false,
      }),
  },
  menus: {
    clearMenus: () => useNavigationStore.getState().clearMenus(),
    refreshMenus: () => useNavigationStore.getState().refreshMenus(),
    refreshRoles: () => useNavigationStore.getState().refreshRoles(),
  },
  callHooks: (name, ...args) => usePluginStore.getState().callHooks(name, ...args),
  applySettings: value => {
    const backendSettings = value as Partial<SystemSettings>
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
  },
})

function useSessionState<T = UserState>(selector: (state: UserState) => T = state => state as unknown as T) {
  return useStore(sessionManager, selector)
}
/** Application-bound selector for integrations outside RuntimeContext; no duplicate state. */
export const useSessionStore = Object.assign(useSessionState, sessionManager)

const unbindQuery = bindQuerySession(queryClient, sessionManager)
if (import.meta.hot) import.meta.hot.dispose(unbindQuery)
