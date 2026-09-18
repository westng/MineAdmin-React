import { createContext } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { SessionManager } from '@/services/auth/session-manager'
import type { HttpClient } from '@/services/http/client'
import type { Telemetry } from '@/services/telemetry'
import type { RouteRegistry } from '@/router/registry'
import type { ComponentManifest } from '@/router/manifest'
import type { PluginHost } from '@/provider/plugins/host'
import type { LocaleRegistry } from '@/provider/i18n/registry'
export interface AppRuntime {
  readonly session: SessionManager
  readonly http: HttpClient
  readonly routes: RouteRegistry
  readonly components: ComponentManifest
  readonly plugins: PluginHost
  readonly locales: LocaleRegistry
  readonly query: QueryClient
  readonly telemetry: Telemetry
}
export const RuntimeContext = createContext<AppRuntime | null>(null)
