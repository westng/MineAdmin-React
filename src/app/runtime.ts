import { sessionManager } from '@/provider/session'
import http from '@/provider/http'
import { routeRegistry } from '@/router/registry'
import { componentManifest } from '@/router/manifest'
import { pluginHost } from '@/provider/plugins/runtime-host'
import { localeRegistry } from '@/provider/i18n/registry'
import { queryClient } from '@/provider/query/client'
import { silentTelemetry } from '@/services/telemetry'
import type { AppRuntime } from '@/provider/runtime/context'

export const runtime: AppRuntime = Object.freeze({
  session: sessionManager,
  http,
  routes: routeRegistry,
  components: componentManifest,
  locales: localeRegistry,
  query: queryClient,
  telemetry: silentTelemetry,
  plugins: pluginHost,
})
