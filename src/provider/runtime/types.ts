import type { createTableCellRenderers } from '@/components/ma-table'
import type { createProTableToolbars } from '@/components/ma-pro-table'
import type { createDashboardSlots } from '@/provider/extensions/dashboard'
import type { createLoginPageConfigurations } from '../extensions/login-page'
import type { createIframePolicy } from '@/layouts/components/iframe/policy'
import type { MenuVo } from '@/services/navigation/types'
import type { CacheStore } from '@/services/storage/cache'
import type { createSettingsStore } from '@/store/settings/create-store'
import type { createI18nManager } from '@/services/i18n/manager'
import type { createTabStore } from '@/store/tabs/create-store'
import type { createKeepAliveStore } from '@/store/keep-alive/create-store'
import type { createLayoutRegistry } from '@/layouts/registry'
import type { createDictionaryManager } from '@/services/dictionary/manager'
import type { QueryClient } from '@tanstack/react-query'
import type { SessionManager } from '@/services/auth/session-manager'
import type { HttpClient } from '@/services/http/client'
import type { Telemetry } from '@/services/telemetry'
import type { ViewResolver } from '@/router/types'
import type { PluginHost } from '@/provider/plugins/host'
import type { LocaleRegistry } from '@/services/i18n/registry'
import type { createNavigationManager } from '@/router/navigation/manager'
import type { createRegistry } from '@/services/registry'
import type { AppRoute } from '@/router/types'
import type { ShellSlotRegistration, ShellPagePolicy } from '@/layouts/slots'
export interface AppRuntime {
  readonly publicRoutes: ReturnType<typeof createRegistry<AppRoute & { id: string }>>
  readonly tableCellRenderers: ReturnType<typeof createTableCellRenderers>
  readonly proTableToolbars: ReturnType<typeof createProTableToolbars>
  readonly dashboard: ReturnType<typeof createDashboardSlots>
  readonly loginPage: ReturnType<typeof createLoginPageConfigurations>
  readonly iframe: ReturnType<typeof createIframePolicy>
  readonly menuFilters: ReturnType<typeof createRegistry<{ id: string; filter: (menu: MenuVo) => boolean }>>
  readonly cache: CacheStore
  readonly settings: ReturnType<typeof createSettingsStore>
  readonly i18n: ReturnType<typeof createI18nManager>
  readonly tabs: ReturnType<typeof createTabStore>
  readonly keepAlive: ReturnType<typeof createKeepAliveStore>
  readonly layouts: ReturnType<typeof createLayoutRegistry>
  readonly pagePolicies: ReturnType<typeof createRegistry<ShellPagePolicy>>
  readonly session: SessionManager
  readonly http: HttpClient
  readonly views: ViewResolver
  readonly plugins: PluginHost
  readonly locales: LocaleRegistry
  readonly query: QueryClient
  readonly telemetry: Telemetry
  readonly dictionaries: ReturnType<typeof createDictionaryManager>
  readonly navigation: ReturnType<typeof createNavigationManager>
  readonly slots: ReturnType<typeof createRegistry<ShellSlotRegistration>>
  readonly onDispose: (dispose: () => void) => () => void
  readonly dispose: () => void
}
