import { dashboardPage } from '@/router/dashboard'
import { createTableCellRenderers } from '@/components/ma-table'
import { createProTableToolbars } from '@/components/ma-pro-table'
import { createDashboardSlots } from '@/provider/extensions/dashboard'
import { createLoginPageConfigurations } from '@/provider/extensions/login-page'
import { createIframePolicy } from '@/layouts/components/iframe/policy'
import type { MenuVo } from '@/services/navigation/types'
import { createCache } from '@/services/storage/cache'
import { createSettingsStore } from '@/store/settings/create-store'
import { createI18nManager } from '@/services/i18n/manager'
import { createTabStore } from '@/store/tabs/create-store'
import { createKeepAliveStore } from '@/store/keep-alive/create-store'
import { createLayoutRegistry } from '@/layouts/registry'
import type { SystemSettings } from '@/store/settings/types'
import { createSessionManager, type SessionPorts } from '@/services/auth/session-manager'
import { createAuthApi } from '@/services/auth/api'
import { createNavigationApi } from '@/services/navigation/api'
import { createHttpClient, type HttpClientOptions } from '@/services/http/client'
import type { StorageAdapter } from '@/services/storage'
import { silentTelemetry } from '@/services/telemetry'
import { createNavigationManager } from '@/router/navigation/manager'
import { createQueryClient, bindQuerySession, queryKeys } from '@/services/query/client'
import { createViewResolver } from '@/router/dynamic-routes'
import type { AppRoute, ViewFiles } from '@/router/types'
import { createLocaleRegistry } from '@/services/i18n/registry'
import { createPluginHost } from '@/provider/plugins/host'
import { createDictionaryManager } from '@/services/dictionary/manager'
import { createRegistry } from '@/services/registry'
import type { ShellSlotRegistration, ShellPagePolicy } from '@/layouts/slots'
import type { AppRuntime } from '@/provider/runtime/types'

export interface RuntimeOptions extends Partial<
  Pick<AppRuntime, 'query' | 'views' | 'locales' | 'plugins' | 'telemetry' | 'slots' | 'dictionaries' | 'layouts'>
> {
  title?: string
  storage: StorageAdapter
  prefix?: string
  baseURL?: string
  origin?: string
  callHooks?: NonNullable<HttpClientOptions['callHooks']>
  applySettings?: SessionPorts['applySettings']
  viewFiles?: ViewFiles
  staticRoutes?: readonly AppRoute[]
}

/** Compose instances once; adapters receive ports and never import this root. */
export function createAppRuntime(options: RuntimeOptions) {
  const dashboard = createDashboardSlots()
  const loginPage = createLoginPageConfigurations()
  const iframe = createIframePolicy()
  const menuFilters = createRegistry<{ id: string; filter: (menu: MenuVo) => boolean }>()
  const filterMenus = (menus: MenuVo[]): MenuVo[] =>
    menus
      .filter(menu => menuFilters.getSnapshot().every(entry => entry.filter(menu)))
      .map(menu => (menu.children ? { ...menu, children: filterMenus(menu.children) } : menu))
  const prefix = options.prefix ?? 'mine_'
  const cache = createCache(options.storage, prefix)
  const settings = createSettingsStore(cache, options.title ?? 'MineAdmin', dashboardPage)
  const tabs = createTabStore(cache)
  const keepAlive = createKeepAliveStore()
  const layouts = options.layouts ?? createLayoutRegistry()
  const pagePolicies = createRegistry<ShellPagePolicy>()
  const query = options.query ?? createQueryClient()
  const locales = options.locales ?? createLocaleRegistry()
  const i18n = createI18nManager(locales, options.storage, prefix)
  const telemetry = options.telemetry ?? silentTelemetry
  const slots = options.slots ?? createRegistry<ShellSlotRegistration>()
  const dictionaries = options.dictionaries ?? createDictionaryManager()
  const plugins = options.plugins ?? createPluginHost(telemetry)
  const views = options.views ?? createViewResolver(options.viewFiles, plugins.isEnabled)
  const callHooks = options.callHooks ?? plugins.callHooks
  const http = createHttpClient({
    baseURL: options.baseURL,
    origin: options.origin,
    callHooks,
    session: () => session.getState(),
  })
  const api = createAuthApi(http)
  const navigation = createNavigationManager({
    query,
    session: () => session.getState(),
    views: () => plugins.getViews(),
    staticRoutes: options.staticRoutes,
    viewResolver: views,
    origin: options.origin,
    api: createNavigationApi(http),
    filterMenus,
    callHooks,
  })
  const session = createSessionManager({
    storage: options.storage,
    prefix,
    callHooks,
    applySettings: value => {
      const next = value as Partial<SystemSettings>
      settings.getState().setSettings(next)
      options.applySettings?.(value)
    },
    api: {
      login: api.loginApi,
      refresh: api.refreshApi,
      logout: api.logoutApi,
      info: () =>
        query.fetchQuery({
          queryKey: queryKeys.resource(session.getState().sessionVersion, 'auth', 'profile'),
          queryFn: ({ signal }) => api.getInfo(signal),
          staleTime: 0,
          retry: false,
        }),
    },
    menus: {
      clearMenus: () => navigation.getState().clearMenus(),
      refreshMenus: () => navigation.getState().refreshMenus(),
      refreshRoles: () => navigation.getState().refreshRoles(),
    },
  })
  const unbindQuery = bindQuerySession(query, session)
  const unbindRoutes = plugins.subscribe(() => navigation.getState().refreshRoutes())
  const unbindShell = session.subscribe((next, previous) => {
    if (next.sessionVersion === previous.sessionVersion) return
    keepAlive.getState().clean()
    const dashboard = settings.getState().settings.dashboardPage
    tabs.getState().clear({
      name: dashboard.name,
      path: dashboard.path,
      fullPath: dashboard.path,
      title: dashboard.title,
      affix: true,
    })
  })
  const disposers = new Set<() => void>()
  let disposed = false
  return Object.freeze({
    publicRoutes: createRegistry<AppRoute & { id: string }>(),
    tableCellRenderers: createTableCellRenderers(),
    proTableToolbars: createProTableToolbars(),
    dashboard,
    loginPage,
    iframe,
    menuFilters,
    cache,
    settings,
    tabs,
    keepAlive,
    layouts,
    pagePolicies,
    i18n,
    session,
    http,
    query,
    views,
    locales,
    plugins,
    telemetry,
    navigation,
    slots,
    dictionaries,
    onDispose(dispose: () => void) {
      if (disposed) {
        dispose()
        return () => undefined
      }
      disposers.add(dispose)
      return () => {
        disposers.delete(dispose)
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const dispose of disposers) {
        try {
          dispose()
        } catch {
          /* Continue releasing independent owners. */
        }
      }
      disposers.clear()
      plugins.dispose()
      unbindRoutes()
      session.dispose()
      i18n.dispose()
      unbindShell()
      unbindQuery()
      void query.cancelQueries()
      query.clear()
      navigation.getState().clearMenus()
    },
  })
}
